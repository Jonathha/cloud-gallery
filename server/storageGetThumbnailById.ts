import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { THUMBNAILS_DIR } from "./storageHelpers";
import { downloadFromR2 } from "./r2Client";
import { AuthenticatedRequest } from "./authMiddleware";
import { getFirestoreDocREST } from "./firestoreREST";

export async function getThumbnailById(req: AuthenticatedRequest, res: Response) {
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

    // Validate ownership in Firestore (the source of truth) using the user's authentic token
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
      console.warn('[getThumbnailById] Firestore REST verification failed/skipped:', dbErr);
    }

    if (!isOwnerOfMedia) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media thumbnail' });
    }

    const filePath = path.join(THUMBNAILS_DIR, `${id}.enc`);
    
    let buffer: Buffer | null = null;
    try {
      buffer = await fs.readFile(filePath);
    } catch (err) {
      console.log(`[getThumbnailById] Local thumbnail ${id}.enc missing. Restoring from R2...`);
      try {
        const r2DataEnc = await downloadFromR2(`thumbnails/${id}.enc`);
        if (r2DataEnc) {
          buffer = r2DataEnc;
          await fs.writeFile(filePath, buffer).catch(() => {});
        }
      } catch (r2RestoreErr) {}
    }

    // Fallback: If no separate thumbnail file, extract from main image file (ENC2)
    if (!buffer) {
      const imgPath = path.join(process.cwd(), 'data', 'images', `${id}.enc`);
      let imgBuf: Buffer | null = null;
      try {
        imgBuf = await fs.readFile(imgPath);
      } catch (e) {
        try {
          imgBuf = await downloadFromR2(`images/${id}.enc`);
        } catch (r2Err) {}
      }

      if (imgBuf && imgBuf.length >= 8) {
        const magic = imgBuf.readUInt32BE(0);
        if (magic === 0x454e4332) { // ENC2
          const metaLen = imgBuf.readUInt32BE(4);
          const metaBytes = imgBuf.subarray(8, 8 + metaLen);
          const metadata = JSON.parse(metaBytes.toString('utf-8'));
          const thumbSize = metadata.thumbSize || 0;
          if (thumbSize > 0) {
            const thumbBytes = imgBuf.subarray(8 + metaLen, 8 + metaLen + thumbSize);
            const thumbMetaStr = JSON.stringify({
              id,
              contentType: "image/jpeg",
              iv: metadata.thumbnailIv || metadata.iv || "",
              fileSalt: metadata.fileSalt || ""
            });
            const thumbMetaBytes = Buffer.from(thumbMetaStr, 'utf-8');
            const totalLen = 8 + thumbMetaBytes.length + thumbBytes.length;
            const resBuf = Buffer.alloc(totalLen);
            resBuf.writeUInt8(0x45, 0); resBuf.writeUInt8(0x4e, 1); resBuf.writeUInt8(0x43, 2); resBuf.writeUInt8(0x31, 3);
            resBuf.writeUInt32BE(thumbMetaBytes.length, 4);
            thumbMetaBytes.copy(resBuf, 8);
            thumbBytes.copy(resBuf, 8 + thumbMetaBytes.length);
            buffer = resBuf;
          }
        }
      }
    }

    if (!buffer) {
      return res.status(404).json({ success: false, error: 'Thumbnail não encontrada' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${id}.enc"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('[getThumbnailById] Error fetching thumbnail:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
