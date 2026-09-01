import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { IMAGES_DIR } from "./storageHelpers";
import { AuthenticatedRequest } from "./authMiddleware";
import { isEncBinary, getMetadataFromEnc } from "./storageHelpersEnc";
import { queryFirestoreREST } from "./firestoreREST";
import { downloadFromR2 } from "./r2Client";

export async function getProtectedImages(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing authenticated user' });
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";
    if (!idToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing session token' });
    }

    // Query Firestore to get the exact list of protected media IDs belonging to this user
    const dbMediaKeys = await queryFirestoreREST('media_keys', userId, idToken);
    const protectedIds = dbMediaKeys.map((k: any) => k.id);

    const images: any[] = [];

    for (const id of protectedIds) {
      const filePath = path.join(IMAGES_DIR, `${id}.enc`);
      let buffer: Buffer | null = null;
      try {
        buffer = await fs.readFile(filePath);
      } catch (e) {
        // Recover only this specific file if missing
        console.log(`[getProtectedImages] Restoring missing protected file ${id}.enc from Cloud...`);
        try {
          const r2Data = await downloadFromR2(`images/${id}.enc`);
          if (r2Data) {
            buffer = r2Data;
            await fs.writeFile(filePath, buffer);
          }
        } catch (dlErr) {
          console.warn(`[getProtectedImages] Failed to restore protected file ${id} from Cloud:`, dlErr);
        }
      }

      if (buffer) {
        try {
          if (isEncBinary(buffer)) {
            const data = getMetadataFromEnc(buffer);
            if (data && data.userId === userId && data.isProtected) {
              images.push({
                id: data.id,
                createdAt: data.createdAt || Date.now(),
                userId: data.userId,
                contentType: data.contentType || 'image/png',
                totalSize: data.totalSize || 0,
                isChunked: data.isChunked || false,
                chunkCount: data.chunkCount || 1,
                thumbnailCiphertext: data.thumbnailCiphertext || '',
                thumbnailIv: data.thumbnailIv || '',
                fileKeyCiphertext: data.fileKeyCiphertext || '',
                fileKeyIv: data.fileKeyIv || '',
                fileSalt: data.fileSalt || '',
                iv: data.iv || ''
              });
            }
          }
        } catch (parseErr) {
          console.error('[getProtectedImages] Skip parsing invalid protected image:', id, parseErr);
        }
      }
    }

    images.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, images });
  } catch (err: any) {
    console.error('[StorageControllerGet] Error listing protected images:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

