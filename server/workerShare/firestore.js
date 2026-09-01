import { 
  getFirestoreDocREST, 
  setFirestoreDocREST, 
  deleteFirestoreDocREST, 
  createFirestoreDocIfNotExistREST, 
  updateFirestoreDocWithPreconditionREST, 
  deleteFirestoreDocWithPreconditionREST 
} from "../workerFirestoreREST.js";

export async function getActiveShareFirestore(deterministicKey, idToken) {
  return getFirestoreDocREST('active_shares', deterministicKey, idToken);
}

export async function getShareDocFirestore(shareId, idToken) {
  return getFirestoreDocREST('shares', shareId, idToken);
}

export async function claimActiveShareFirestore(deterministicKey, claimPayload, existingClaim, idToken) {
  if (!existingClaim) {
    return createFirestoreDocIfNotExistREST('active_shares', deterministicKey, claimPayload, idToken);
  } else {
    return updateFirestoreDocWithPreconditionREST(
      'active_shares', 
      deterministicKey, 
      claimPayload, 
      { updateTime: existingClaim._updateTime }, 
      idToken
    );
  }
}

export async function saveInitialShareFirestore(id, shareData, ciphertext, idToken) {
  return setFirestoreDocREST('shares', id, {
    ...shareData,
    ciphertext: ciphertext.length < 750 * 1024 ? ciphertext : ''
  }, idToken);
}

export async function promoteShareStatusFirestore(deterministicKey, id, shareData, ciphertext, idToken) {
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
    console.warn("[promoteShareStatusFirestore] Status update to active failed:", actErr);
  }
}

export async function rollbackShareReservationFirestore(deterministicKey, id, idToken) {
  try {
    const currentClaim = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
    if (currentClaim && (currentClaim.shareId === id || currentClaim.id === id)) {
      if (currentClaim._updateTime) {
        try {
          await deleteFirestoreDocWithPreconditionREST('active_shares', deterministicKey, { updateTime: currentClaim._updateTime }, idToken);
        } catch {
          await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
        }
      } else {
        await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
      }
    }
    await deleteFirestoreDocREST('shares', id, idToken);
  } catch (cleanErr) {
    console.error("[rollbackShareReservationFirestore] Compensation rollback failed:", cleanErr);
  }
}

export async function deleteShareFirestore(deterministicKey, shareId, idToken) {
  if (deterministicKey) {
    try {
      const activeDoc = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
      if (activeDoc && (activeDoc.shareId === shareId || activeDoc.id === shareId)) {
        if (activeDoc._updateTime) {
          try {
            await deleteFirestoreDocWithPreconditionREST('active_shares', deterministicKey, { updateTime: activeDoc._updateTime }, idToken);
          } catch {
            await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
          }
        } else {
          await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
        }
      }
      await deleteFirestoreDocREST('shares', shareId, idToken);
    } catch (err) {
      console.warn("Firestore share delete failed:", err);
      try { await deleteFirestoreDocREST('shares', shareId, idToken); } catch {}
    }
  } else {
    try { await deleteFirestoreDocREST('shares', shareId, idToken); } catch {}
  }
}
