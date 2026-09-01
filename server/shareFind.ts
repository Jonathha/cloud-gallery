import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { getDB } from "./firebaseAdmin";
import { downloadFromR2, listKeysFromR2 } from "./r2Client";
import { SHARES_DIR, ensureSharesDir } from "./shareHelpers";
import { AuthenticatedRequest } from "./authMiddleware";
import { getFirestoreDocREST } from "./firestoreREST";

export async function findExistingShare(req: AuthenticatedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    if (!authUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing authenticated user' });
    }

    const { imageId } = req.params;
    if (!imageId || !/^[a-zA-Z0-9_-]+$/.test(imageId)) {
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
      const imgDoc = await getFirestoreDocREST('images', imageId, idToken);
      if (imgDoc && imgDoc.userId === authUid) {
        isOwnerOfMedia = true;
      } else {
        // Try protected media in 'media_keys'
        const keyDoc = await getFirestoreDocREST('media_keys', imageId, idToken);
        if (keyDoc && keyDoc.userId === authUid) {
          isOwnerOfMedia = true;
        }
      }
    } catch (dbErr) {
      console.warn('[findExistingShare] Firestore REST verification failed/skipped:', dbErr);
    }

    if (!isOwnerOfMedia) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media owned by another user or media not found' });
    }

    const now = Date.now();
    const sharesMap = new Map<string, any>();

    const checkAndAddShare = (data: any) => {
      if (!data || !data.id || data.imageId !== imageId) return;
      if (data.userId && data.userId !== authUid) return;
      const isExpired = (data.options?.expiresAt && data.options.expiresAt <= now) ||
        (data.options?.oneTimeView && data.firstViewedAt && (now - data.firstViewedAt > 60000));
      if (!isExpired) {
        sharesMap.set(data.id, data);
      }
    };

    // Search local folder
    try {
      const localFiles = await fs.readdir(SHARES_DIR);
      for (const file of localFiles) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(SHARES_DIR, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            checkAndAddShare(data);
          } catch (e) {
            console.error('[ShareService] Parse error local file:', file, e);
          }
        }
      }
    } catch (e) {
      await ensureSharesDir();
    }

    // Search Cloudflare R2
    try {
      const keys = await listKeysFromR2("shares/");
      for (const key of keys) {
        if (key.startsWith("shares/") && key.endsWith(".json")) {
          const r2Buffer = await downloadFromR2(key);
          if (r2Buffer) {
            const r2Content = r2Buffer.toString('utf-8');
            const parsed = JSON.parse(r2Content);
            if (parsed.imageId === imageId) {
              const filePath = path.join(SHARES_DIR, `${parsed.id}.json`);
              await fs.writeFile(filePath, r2Content, 'utf-8');
              checkAndAddShare(parsed);
            }
          }
        }
      }
    } catch (r2Err) {
      console.warn('[ShareService] R2 share search skipped:', r2Err);
    }

    // Search Firestore
    const db = getDB();
    if (db) {
      try {
        const sharesRef = db.collection('shares');
        const snapshot = await sharesRef.where('imageId', '==', imageId).get();
        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() };
          checkAndAddShare(data);
        });
      } catch (fsErr) {
        console.warn('[ShareService] Firestore fallback failed:', fsErr);
      }
    }

    const matchingShares = Array.from(sharesMap.values());
    matchingShares.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return res.json({
      success: true,
      shares: matchingShares,
      share: matchingShares[0] || null
    });
  } catch (err: any) {
    console.error('[ShareService] Error finding share:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

