import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { getDB } from "./firebaseAdmin";
import { downloadFromR2 } from "./r2Client";
import { SHARES_DIR, ensureSharesDir } from "./shareHelpers";
import { AuthenticatedRequest } from "./authMiddleware";
import { getFirestoreDocREST } from "./firestoreREST";
import { claimKeysFor, MAX_SHARES_PER_MEDIA } from "./shares/claimKeys";

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
      if (data.status === 'pending' || data.status === 'failed' || data.status === 'revoked') return;
      const isExpired = (data.options?.expiresAt && data.options.expiresAt <= now) ||
        (data.options?.oneTimeView && data.firstViewedAt && (now - data.firstViewedAt > 60000));
      if (!isExpired) sharesMap.set(data.id, data);
    };

    // Each active link owns a claim slot, so at most MAX_SHARES_PER_MEDIA lookups are needed
    // (instead of scanning every local file and downloading every share object from R2).
    const claims = await Promise.all(
      claimKeysFor(authUid, imageId).map((key) => getFirestoreDocREST('active_shares', key, idToken).catch(() => null))
    );
    const claimedIds = Array.from(new Set(claims.map((c: any) => c?.shareId || c?.id).filter(Boolean))) as string[];

    const loadShareById = async (id: string) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
      try {
        return JSON.parse(await fs.readFile(path.join(SHARES_DIR, `${id}.json`), 'utf-8'));
      } catch {}
      try {
        const r2Buffer = await downloadFromR2(`shares/${id}.json`);
        if (r2Buffer) {
          const content = r2Buffer.toString('utf-8');
          await fs.writeFile(path.join(SHARES_DIR, `${id}.json`), content, 'utf-8').catch(() => {});
          return JSON.parse(content);
        }
      } catch {}
      try {
        return await getFirestoreDocREST('shares', id, idToken);
      } catch {}
      return null;
    };
    (await Promise.all(claimedIds.map(loadShareById))).forEach(checkAndAddShare);

    // Admin SDK query (indexed) also catches links created before claim slots existed.
    const db = getDB();
    if (db) {
      try {
        const snapshot = await db.collection('shares').where('imageId', '==', imageId).get();
        snapshot.docs.forEach(doc => checkAndAddShare({ id: doc.id, ...doc.data() }));
      } catch (fsErr) {
        console.warn('[ShareService] Firestore fallback failed:', fsErr);
      }
    }

    // The listing never needs the encrypted payload; omitting it keeps the response small.
    const matchingShares = Array.from(sharesMap.values())
      .map(({ ciphertext, iv, ...rest }: any) => rest)
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, MAX_SHARES_PER_MEDIA);

    return res.json({
      success: true,
      shares: matchingShares,
      share: matchingShares[0] || null,
      limit: MAX_SHARES_PER_MEDIA
    });
  } catch (err: any) {
    console.error('[ShareService] Error finding share:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

