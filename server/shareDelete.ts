import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { getDB } from "./firebaseAdmin";
import { deleteFromR2, downloadFromR2 } from "./r2Client";
import { SHARES_DIR } from "./shareHelpers";
import { AuthenticatedRequest } from "./authMiddleware";
import { getFirestoreDocREST, deleteFirestoreDocREST, deleteFirestoreDocWithPreconditionREST } from "./firestoreREST";

export async function deleteShare(req: AuthenticatedRequest, res: Response) {
  try {
    const authUid = req.user?.uid;
    if (!authUid) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Missing authenticated user' });
    }

    const { shareId } = req.params;
    if (!shareId || !/^[a-zA-Z0-9_-]+$/.test(shareId)) {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";

    let imageId = '';
    const db = getDB();

    // 1. Fetch and verify ownership from Firestore / REST
    let shareData: any = null;
    if (db) {
      try {
        const docSnap = await db.collection('shares').doc(shareId).get();
        if (docSnap.exists) {
          shareData = docSnap.data();
        }
      } catch (e) {
        console.error('[ShareService] Error checking share in Firestore Admin:', e);
      }
    }

    if (!shareData && idToken) {
      try {
        shareData = await getFirestoreDocREST('shares', shareId, idToken);
      } catch (e) {}
    }

    const filePath = path.join(SHARES_DIR, `${shareId}.json`);
    if (!shareData) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        shareData = JSON.parse(content);
      } catch (e) {}
    }

    if (shareData) {
      if (shareData.userId && shareData.userId !== authUid) {
        return res.status(403).json({ success: false, error: 'Forbidden: Cannot delete a share belonging to another user' });
      }
      if (shareData.imageId) {
        imageId = shareData.imageId;
      }
    }

    // 2. Atomic Firestore cleanup: delete shares/{shareId} and conditionally delete active_shares/{authUid_imageId}
    if (imageId) {
      const deterministicKey = `${authUid}_${imageId}`;
      if (db) {
        try {
          await db.runTransaction(async (t: any) => {
            const activeRef = db.collection('active_shares').doc(deterministicKey);
            const activeSnap = await t.get(activeRef);
            if (activeSnap.exists) {
              const activeData = activeSnap.data();
              if (activeData?.shareId === shareId || activeData?.id === shareId) {
                t.delete(activeRef);
              }
            }
            t.delete(db.collection('shares').doc(shareId));
          });
        } catch (e) {
          console.error('[ShareService] Firestore Admin delete transaction error:', e);
        }
      } else if (idToken) {
        try {
          const activeDoc = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
          if (activeDoc && (activeDoc.shareId === shareId || activeDoc.id === shareId)) {
            if (activeDoc._updateTime) {
              try {
                await deleteFirestoreDocWithPreconditionREST('active_shares', deterministicKey, { updateTime: activeDoc._updateTime }, idToken);
              } catch (pErr) {}
            } else {
              await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
            }
          }
          await deleteFirestoreDocREST('shares', shareId, idToken);
        } catch (e) {
          console.warn('[ShareService] Firestore REST delete error:', e);
          try {
            await deleteFirestoreDocREST('shares', shareId, idToken);
          } catch (delErr) {}
        }
      }
    } else {
      if (db) {
        try { await db.collection('shares').doc(shareId).delete(); } catch (e) {}
      } else if (idToken) {
        try { await deleteFirestoreDocREST('shares', shareId, idToken); } catch (e) {}
      }
    }

    // 3. Local file cleanup
    try {
      await fs.unlink(filePath);
    } catch (e) {}

    if (imageId) {
      const activePointerPath = path.join(SHARES_DIR, `active_${authUid}_${imageId}.json`);
      try {
        const pointerContent = await fs.readFile(activePointerPath, 'utf-8');
        const pointerData = JSON.parse(pointerContent);
        if (pointerData?.shareId === shareId || pointerData?.id === shareId) {
          await fs.unlink(activePointerPath);
        }
      } catch (e) {}

      // 4. R2 conditional active pointer cleanup
      try {
        const r2ActiveBuffer = await downloadFromR2(`active_shares/${authUid}_${imageId}.json`);
        if (r2ActiveBuffer) {
          const r2ActiveData = JSON.parse(r2ActiveBuffer.toString('utf-8'));
          if (r2ActiveData?.shareId === shareId || r2ActiveData?.id === shareId) {
            await deleteFromR2(`active_shares/${authUid}_${imageId}.json`);
          }
        }
      } catch (e) {}
    }

    // 5. Delete from Cloudflare R2
    try {
      await deleteFromR2(`shares/${shareId}.json`);
    } catch (e) {}

    res.json({ success: true });
  } catch (err: any) {
    console.error('[ShareService] Error deleting share:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
