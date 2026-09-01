import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { IMAGES_DIR } from "./storageHelpers";
import { downloadFromR2 } from "./r2Client";
import { isEncBinary, wrapJsonToEnc, getMetadataFromEnc } from "./storageHelpersEnc";
import { AuthenticatedRequest } from "./authMiddleware";
import { getFirestoreDocREST } from "./firestoreREST";

export async function getImageById(req: AuthenticatedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    if (!authUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing user token' });
    }

    const { id } = req.params;
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";
    if (!idToken) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing session token' });
    }

    // LAYER 1: Validate ownership in Firestore (the source of truth) using the user's authentic token
    let isOwnerOfMedia = false;
    try {
      const imgDoc = await getFirestoreDocREST('images', id, idToken);
      if (imgDoc && imgDoc.userId === authUid) {
        isOwnerOfMedia = true;
      } else {
        // Try protected media in 'media_keys'
        const keyDoc = await getFirestoreDocREST('media_keys', id, idToken);
        if (keyDoc && keyDoc.userId === authUid) {
          isOwnerOfMedia = true;
        }
      }
    } catch (dbErr) {
      console.warn('[getImageById] Firestore REST verification failed/skipped:', dbErr);
    }

    if (!isOwnerOfMedia) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media owned by another user or media not found' });
    }

    const filePath = path.join(IMAGES_DIR, `${id}.enc`);
    
    let buffer: Buffer | null = null;
    try {
      buffer = await fs.readFile(filePath);
    } catch (err) {
      console.log(`[StorageControllerUploadDelete] Local file ${id}.enc is missing. Restoring from Cloud...`);
      
      if (!buffer) {
        try {
          const r2DataEnc = await downloadFromR2(`images/${id}.enc`);
          if (r2DataEnc) {
            buffer = r2DataEnc;
            await fs.writeFile(filePath, buffer);
          } else {
            const r2DataJson = await downloadFromR2(`images/${id}.json`);
            if (r2DataJson) {
              const fileData = JSON.parse(r2DataJson.toString('utf-8'));
              buffer = wrapJsonToEnc(fileData);
              await fs.writeFile(filePath, buffer);
            }
          }
        } catch (r2RestoreErr) {
          console.error(`[StorageControllerUploadDelete] Failed restoring image ${id} from Cloudflare R2:`, r2RestoreErr);
        }
      }
    }

    if (!buffer) {
      return res.status(404).json({ success: false, error: 'Mídia não encontrada localmente nem no Cloudflare R2' });
    }

    if (!isEncBinary(buffer)) {
      try {
        const fileData = JSON.parse(buffer.toString('utf-8'));
        buffer = wrapJsonToEnc(fileData);
      } catch (e) {
        return res.status(500).json({ success: false, error: 'Erro ao processar dados da mídia antiga.' });
      }
    }

    // LAYER 2: Double check file-level headers. Reject download immediately if verification fails.
    try {
      const metadata = getMetadataFromEnc(buffer);
      if (!metadata || !metadata.userId || metadata.userId !== authUid) {
        return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media owned by another user' });
      }
    } catch (metaErr) {
      return res.status(403).json({ success: false, error: 'Forbidden: Could not validate media metadata' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.enc"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('[StorageControllerUploadDelete] Error fetching image:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

