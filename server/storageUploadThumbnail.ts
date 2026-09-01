import { Response } from "express";
import fs from "node:fs/promises";
import path from "path";
import { THUMBNAILS_DIR, IMAGES_DIR } from "./storageHelpers";
import { isEncBinary, getMetadataFromEnc } from "./storageHelpersEnc";
import { uploadToR2 } from "./r2Client";
import { AuthenticatedRequest } from "./authMiddleware";
import { getFirestoreDocREST } from "./firestoreREST";

async function getRawBody(req: AuthenticatedRequest, maxSizeBytes: number = 10 * 1024 * 1024): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSizeBytes) {
        req.destroy();
        reject(new Error("Payload too large: Max thumbnail limit is 10MB"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", (err) => reject(err));
  });
}

export async function uploadThumbnail(req: AuthenticatedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    if (!authUid) {
      return res.status(401).json({ success: false, error: "Unauthorized: Missing user token" });
    }

    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID format" });
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";

    // Validate ownership in Firestore or local metadata before allowing thumbnail write
    let isOwnerOfMedia = false;
    if (idToken) {
      try {
        const imgDoc = await getFirestoreDocREST('images', id, idToken);
        if (imgDoc && imgDoc.userId === authUid) {
          isOwnerOfMedia = true;
        } else {
          const keyDoc = await getFirestoreDocREST('media_keys', id, idToken);
          if (keyDoc && keyDoc.userId === authUid) {
            isOwnerOfMedia = true;
          }
        }
      } catch (dbErr) {
        console.warn('[uploadThumbnail] Firestore verification warning:', dbErr);
      }
    }

    if (!isOwnerOfMedia) {
      // Check local image file metadata
      const localImagePath = path.join(IMAGES_DIR, `${id}.enc`);
      try {
        const buf = await fs.readFile(localImagePath);
        if (buf && isEncBinary(buf)) {
          const meta = getMetadataFromEnc(buf);
          if (meta && meta.userId === authUid) {
            isOwnerOfMedia = true;
          }
        }
      } catch (e) {}
    }

    if (!isOwnerOfMedia) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media thumbnail (ownership verification failed)' });
    }

    const rawBuffer = await getRawBody(req);

    // Save locally
    const filePath = path.join(THUMBNAILS_DIR, `${id}.enc`);
    await fs.writeFile(filePath, rawBuffer);

    // Save to Cloudflare R2
    try {
      await uploadToR2(`thumbnails/${id}.enc`, rawBuffer, "application/octet-stream");
    } catch (r2Err) {
      console.error("[uploadThumbnail] R2 error:", r2Err);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[StorageControllerUploadThumbnail] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
