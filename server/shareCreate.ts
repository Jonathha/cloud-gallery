import { Response } from "express";
import path from "path";
import fs from "node:fs/promises";
import { getDB } from "./firebaseAdmin";
import { uploadToR2, downloadFromR2 } from "./r2Client";
import { SHARES_DIR, isShareActive } from "./shareHelpers";
import { AuthenticatedRequest } from "./authMiddleware";
import { 
  getFirestoreDocREST, 
  setFirestoreDocREST, 
  deleteFirestoreDocREST,
  createFirestoreDocIfNotExistREST, 
  updateFirestoreDocWithPreconditionREST, 
  deleteFirestoreDocWithPreconditionREST 
} from "./firestoreREST";

export async function createShare(req: AuthenticatedRequest, res: Response) {
  const authUid = req.user?.uid;
  if (!authUid) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing authenticated user' });
  }

  const { id, imageId, ciphertext, iv, options } = req.body;
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id) || id.length < 16 || !imageId || !ciphertext || !iv) {
    return res.status(400).json({ success: false, error: 'Missing or invalid data' });
  }

  try {
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
      console.warn('[createShare] Firestore REST verification failed/skipped:', dbErr);
    }

    if (!isOwnerOfMedia) {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media owned by another user or media not found' });
    }

    const now = Date.now();
    const deterministicKey = `${authUid}_${imageId}`;

    const shareData = {
      id,
      imageId,
      userId: authUid, // Force authenticated user ID to prevent spoofing
      ciphertext,
      iv,
      isChunked: req.body.isChunked || false,
      chunkCount: req.body.chunkCount || 1,
      contentType: req.body.contentType || 'image/png',
      totalSize: req.body.totalSize || 0,
      status: 'pending',
      options: {
        requirePassword: !!options?.requirePassword,
        encryptedShareKey: options?.encryptedShareKey || null,
        ivShareKey: options?.ivShareKey || null,
        allowDownload: options?.allowDownload !== false,
        oneTimeView: !!options?.oneTimeView,
        expiresAt: options?.expiresAt || null
      },
      createdAt: now,
      updatedAt: now,
      firstViewedAt: null,
      firstViewerIp: null
    };

    // LAYER 2: Atomic Firestore Transaction Reservation
    // We lock & claim active_shares/{userId_imageId} with 'pending' status inside a real transaction
    const db = getDB();
    try {
      if (db) {
        await db.runTransaction(async (t: any) => {
          // Precondition 1: Check if the target share ID already exists
          const shareRef = db.collection('shares').doc(id);
          const shareSnap = await t.get(shareRef);
          if (shareSnap.exists) {
            const err: any = new Error('SHARE_ID_ALREADY_EXISTS');
            err.code = 'ALREADY_EXISTS';
            throw err;
          }

          // Precondition 2: Check active claim
          const activeRef = db.collection('active_shares').doc(deterministicKey);
          const activeSnap = await t.get(activeRef);
          if (activeSnap.exists) {
            const activeData = activeSnap.data();
            if (activeData && isShareActive(activeData, now)) {
              const err: any = new Error('ACTIVE_SHARE_EXISTS');
              err.existingShareId = activeData.shareId || activeData.id;
              throw err;
            }
          }
          t.set(activeRef, {
            id,
            shareId: id,
            imageId,
            userId: authUid,
            status: 'pending',
            options: shareData.options,
            createdAt: now,
            updatedAt: now,
            firstViewedAt: null
          });
          t.set(shareRef, {
            ...shareData,
            ciphertext: ciphertext.length < 750 * 1024 ? ciphertext : ''
          });
        });
      } else {
        // Check if the share ID already exists in Firestore
        const existingShareDoc = await getFirestoreDocREST('shares', id, idToken);
        if (existingShareDoc) {
          const err: any = new Error('SHARE_ID_ALREADY_EXISTS');
          err.code = 'ALREADY_EXISTS';
          throw err;
        }

        const existingClaim = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
        if (existingClaim && isShareActive(existingClaim, now)) {
          const err: any = new Error('ACTIVE_SHARE_EXISTS');
          err.existingShareId = existingClaim.shareId || existingClaim.id;
          throw err;
        }

        const claimPayload = {
          id,
          shareId: id,
          imageId,
          userId: authUid,
          status: 'pending',
          options: shareData.options,
          createdAt: now,
          updatedAt: now,
          firstViewedAt: null
        };

        if (!existingClaim) {
          await createFirestoreDocIfNotExistREST('active_shares', deterministicKey, claimPayload, idToken);
        } else {
          await updateFirestoreDocWithPreconditionREST(
            'active_shares',
            deterministicKey,
            claimPayload,
            { updateTime: existingClaim._updateTime },
            idToken
          );
        }

        // Atomically create the share document ensuring it does not already exist
        await createFirestoreDocIfNotExistREST('shares', id, {
          ...shareData,
          ciphertext: ciphertext.length < 750 * 1024 ? ciphertext : ''
        }, idToken);
      }
    } catch (transErr: any) {
      if (transErr.message === 'SHARE_ID_ALREADY_EXISTS' || transErr.code === 'ALREADY_EXISTS') {
        return res.status(409).json({
          success: false,
          error: 'Conflito: Este identificador de compartilhamento já existe. Tente gerar novamente com outro ID.'
        });
      }
      if (transErr.message === 'ACTIVE_SHARE_EXISTS' || transErr.existingShareId) {
        return res.status(409).json({
          success: false,
          error: 'Já existe um link de compartilhamento ativo para esta imagem. Exclua o link existente antes de gerar um novo.',
          existingShareId: transErr.existingShareId
        });
      }
      if (transErr.code === 'PRECONDITION_FAILED' || 
          transErr.status === 409 || 
          transErr.message?.includes('ABORTED') || 
          transErr.message?.includes('FAILED_PRECONDITION')) {
        return res.status(409).json({
          success: false,
          error: 'Já existe uma solicitação de compartilhamento sendo processada simultaneamente para esta imagem.'
        });
      }
      throw transErr;
    }

    // LAYER 3: Payload Persistence (Local, Google Drive, R2)
    const filePath = path.join(SHARES_DIR, `${id}.json`);
    try {
      // Local file
      await fs.writeFile(filePath, JSON.stringify({ ...shareData, status: 'active' }), 'utf-8');
      const activePointerPath = path.join(SHARES_DIR, `active_${authUid}_${imageId}.json`);
      await fs.writeFile(activePointerPath, JSON.stringify({
        id,
        shareId: id,
        imageId,
        userId: authUid,
        status: 'active',
        options: shareData.options,
        createdAt: shareData.createdAt,
        firstViewedAt: null
      }), 'utf-8');

      // Cloudflare R2
      await uploadToR2(`shares/${id}.json`, { ...shareData, status: 'active' });
      await uploadToR2(`active_shares/${authUid}_${imageId}.json`, {
        id,
        shareId: id,
        imageId,
        userId: authUid,
        status: 'active',
        options: shareData.options,
        createdAt: shareData.createdAt,
        firstViewedAt: null
      });

      // Update status in Firestore to 'active' (ONLY if active_shares still points to this id)
      if (db) {
        await db.runTransaction(async (t: any) => {
          const activeRef = db.collection('active_shares').doc(deterministicKey);
          const activeSnap = await t.get(activeRef);
          if (activeSnap.exists) {
            const activeData = activeSnap.data();
            if (activeData?.shareId === id || activeData?.id === id) {
              t.update(activeRef, { status: 'active', updatedAt: Date.now() });
              t.update(db.collection('shares').doc(id), { status: 'active' });
            }
          }
        });
      } else {
        try {
          const currentClaim = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
          if (currentClaim && (currentClaim.shareId === id || currentClaim.id === id)) {
            await setFirestoreDocREST('active_shares', deterministicKey, {
              ...currentClaim,
              status: 'active',
              updatedAt: Date.now()
            }, idToken);
            await setFirestoreDocREST('shares', id, {
              ...shareData,
              status: 'active',
              ciphertext: ciphertext.length < 750 * 1024 ? ciphertext : ''
            }, idToken);
          }
        } catch (actErr) {
          console.warn('[ShareService] Status update to active failed:', actErr);
        }
      }

      return res.json({ success: true, share: { ...shareData, status: 'active' } });
    } catch (uploadErr: any) {
      console.error('[ShareService] R2/Storage upload failed. Compensating and rolling back Firestore reservation:', uploadErr);
      
      // Rollback / clean up reservation in Firestore if still pointing to id
      try {
        if (db) {
          await db.runTransaction(async (t: any) => {
            const activeRef = db.collection('active_shares').doc(deterministicKey);
            const activeSnap = await t.get(activeRef);
            if (activeSnap.exists) {
              const activeData = activeSnap.data();
              if (activeData?.shareId === id || activeData?.id === id) {
                t.delete(activeRef);
                t.delete(db.collection('shares').doc(id));
              }
            }
          });
        } else {
          const currentClaim = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
          if (currentClaim && (currentClaim.shareId === id || currentClaim.id === id)) {
            if (currentClaim._updateTime) {
              try {
                await deleteFirestoreDocWithPreconditionREST('active_shares', deterministicKey, { updateTime: currentClaim._updateTime }, idToken);
              } catch (delPErr) {
                await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
              }
            } else {
              await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
            }
          }
          await deleteFirestoreDocREST('shares', id, idToken);
        }
      } catch (cleanErr) {
        console.error('[ShareService] Compensation cleanup error:', cleanErr);
      }

      try { await fs.unlink(filePath); } catch (e) {}

      return res.status(500).json({ success: false, error: 'Falha ao salvar payload do compartilhamento no R2' });
    }
  } catch (err: any) {
    console.error('[ShareService] Error creating share:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

