import { Response } from "express";
import { AuthenticatedRequest } from "./authMiddleware";
import { verifyMediaOwnership, validateShareRequestBody, validateShareOptionsCombination } from "./shares/ownershipVerifier";
import { buildShareData } from "./shares/shareDataBuilder";
import { reserveShareInFirestoreREST } from "./shares/firestoreReservation";
import { persistShareFiles } from "./shares/persistFiles";
import { rollbackShareReservation } from "./shares/rollbackReservation";
import { handleShareCreationError } from "./shares/shareErrorMapper";

export async function createShare(req: AuthenticatedRequest, res: Response) {
  const authUid = req.user?.uid;
  if (!authUid) return res.status(401).json({ success: false, error: 'Unauthorized: Missing authenticated user' });

  const { id, imageId, ciphertext, iv, options } = req.body;
  if (!validateShareRequestBody(req.body)) return res.status(400).json({ success: false, error: 'Missing or invalid data' });
  const optionsError = validateShareOptionsCombination(options);
  if (optionsError) return res.status(400).json({ success: false, code: 'INVALID_SHARE_OPTIONS', error: optionsError });

  try {
    const authHeader = req.headers.authorization;
    const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";
    if (!idToken) return res.status(401).json({ success: false, error: 'Unauthorized: Missing session token' });

    const isOwner = await verifyMediaOwnership(imageId, authUid, idToken);
    if (!isOwner) return res.status(403).json({ success: false, error: 'Forbidden: Access denied to media owned by another user or media not found' });

    const now = Date.now();
    const shareData = buildShareData(id, imageId, authUid, ciphertext, iv, options, req.body, now);

    let claimKey: string;
    try {
      claimKey = await reserveShareInFirestoreREST(id, authUid, shareData, idToken, now);
    } catch (transErr: any) {
      if (handleShareCreationError(transErr, res)) return;
      throw transErr;
    }

    try {
      await persistShareFiles(id, authUid, imageId, shareData, idToken, claimKey);
      return res.json({ success: true, share: { ...shareData, status: 'active' } });
    } catch (uploadErr: any) {
      console.error('[ShareService] R2 upload failed. Rolling back Firestore reservation:', uploadErr);
      await rollbackShareReservation(id, authUid, imageId, idToken, claimKey);
      return res.status(500).json({ success: false, error: 'Falha ao salvar payload do compartilhamento no R2' });
    }
  } catch (err: any) {
    console.error('[ShareService] Error creating share:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
