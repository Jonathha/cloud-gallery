import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { IMAGES_DIR } from "./storageHelpers";
import { deleteSharesForImage } from "./shareService";
import { deleteFromR2 } from "./r2Client";
import { AuthenticatedRequest } from "./authMiddleware";
import { getMetadataFromEnc, isEncBinary } from "./storageHelpersEnc";
import { getFirestoreDocREST, deleteFirestoreDocREST } from "./firestoreREST";

export async function deleteImageById(req: AuthenticatedRequest, res: Response) {
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

    // LAYER 1: Validate ownership in Firestore (the source of truth) using the user's authentic token FIRST
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
      console.warn('[deleteImageById] Firestore REST verification failed/skipped:', dbErr);
    }

    if (!isOwnerOfMedia) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media owned by another user or media not found' });
    }

    // LAYER 2: Double check local file-level ownership if file exists
    const filePathEnc = path.join(IMAGES_DIR, `${id}.enc`);
    const filePathJson = path.join(IMAGES_DIR, `${id}.json`);

    try {
      let fileBuffer: Buffer | null = null;
      try {
        fileBuffer = await fs.readFile(filePathEnc);
      } catch (e) {
        try {
          fileBuffer = await fs.readFile(filePathJson);
        } catch (e2) {}
      }

      if (fileBuffer) {
        let fileUserId: string | null = null;
        if (isEncBinary(fileBuffer)) {
          const meta = getMetadataFromEnc(fileBuffer);
          fileUserId = meta?.userId;
        } else {
          const jsonData = JSON.parse(fileBuffer.toString('utf-8'));
          fileUserId = jsonData?.userId;
        }

        if (fileUserId && fileUserId !== authUid) {
          return res.status(403).json({ success: false, error: 'Forbidden: Cannot delete file belonging to another user' });
        }
      }
    } catch (checkErr) {
      console.warn('[deleteImageById] Local file check failed/skipped:', checkErr);
    }
    
    // Proceed with deletion of file artifacts
    const thumbPathEnc = path.join(path.resolve(IMAGES_DIR, '..', 'thumbnails'), `${id}.enc`);
    try { await fs.unlink(filePathEnc); } catch (e) {}
    try { await fs.unlink(filePathJson); } catch (e) {}
    try { await fs.unlink(thumbPathEnc); } catch (e) {}

    try {
      await deleteFromR2(`images/${id}.enc`);
    } catch (r2DelErr) {}
    try {
      await deleteFromR2(`images/${id}.json`);
    } catch (r2DelErr) {}
    try {
      await deleteFromR2(`thumbnails/${id}.enc`);
    } catch (r2DelErr) {}

    try {
      await deleteSharesForImage(id);
    } catch (sharePurgeErr) {
      console.error(`[StorageControllerUploadDelete] Failed to purge associated shares for image ${id}:`, sharePurgeErr);
    }

    // Clean up Firestore documents as a secondary safety measure
    try {
      await deleteFirestoreDocREST('images', id, idToken);
      await deleteFirestoreDocREST('media_keys', id, idToken);
    } catch (fsCleanErr) {
      console.warn('[deleteImageById] Secondary Firestore doc cleanup warning:', fsCleanErr);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('[StorageControllerUploadDelete] Error deleting image:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

