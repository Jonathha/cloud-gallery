import { jsonResponse } from "../workerHelpers.js";
import { isShareActive } from "./helpers.js";
import { authenticateShareRequest, checkMediaOwnership } from "./auth.js";
import { 
  getActiveShareFirestore, 
  claimActiveShareFirestore, 
  saveInitialShareFirestore, 
  promoteShareStatusFirestore, 
  rollbackShareReservationFirestore 
} from "./firestore.js";
import { saveShareR2 } from "./r2.js";
import { validateCreatePayload, buildShareData, isClaimConflictError } from "./shareCreateHelpers.js";

export async function handleCreateShare(request, env) {
  let verifiedUser, idToken;
  try {
    const authResult = await authenticateShareRequest(request);
    verifiedUser = authResult.verifiedUser;
    idToken = authResult.idToken;
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const body = await request.json();
  if (!validateCreatePayload(body)) {
    return jsonResponse({ success: false, error: "Missing or invalid required share parameters" }, 400);
  }

  const { id, imageId, ciphertext } = body;
  const isOwnerOfMedia = await checkMediaOwnership(imageId, verifiedUser.uid, idToken);
  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não é proprietário desta mídia." }, 403);
  }

  const now = Date.now();
  const deterministicKey = `${verifiedUser.uid}_${imageId}`;
  const shareData = buildShareData(body, verifiedUser.uid, now);

  try {
    const existingClaim = await getActiveShareFirestore(deterministicKey, idToken);
    if (existingClaim && isShareActive(existingClaim, now)) {
      return jsonResponse({
        success: false,
        error: "Já existe um link de compartilhamento ativo para esta mídia. Exclua o link existente antes de gerar um novo.",
        existingShareId: existingClaim.shareId || existingClaim.id
      }, 409);
    }

    const claimPayload = {
      id,
      shareId: id,
      imageId,
      userId: verifiedUser.uid,
      status: 'pending',
      options: shareData.options,
      createdAt: now,
      updatedAt: now,
      firstViewedAt: null
    };

    await claimActiveShareFirestore(deterministicKey, claimPayload, existingClaim, idToken);
    await saveInitialShareFirestore(id, shareData, ciphertext, idToken);
  } catch (claimErr) {
    if (isClaimConflictError(claimErr)) {
      return jsonResponse({
        success: false,
        error: "Já existe uma solicitação de compartilhamento sendo processada simultaneamente para esta imagem."
      }, 409);
    }
    console.error('[handleCreateShare] Firestore claim failed:', claimErr);
    return jsonResponse({ success: false, error: "Erro ao registrar reserva de compartilhamento no Firestore" }, 500);
  }

  const bucket = env.R2 || env.CHAT_R2;
  if (bucket) {
    try {
      await saveShareR2(bucket, id, deterministicKey, shareData, verifiedUser.uid, imageId);
      await promoteShareStatusFirestore(deterministicKey, id, shareData, ciphertext, idToken);
    } catch (r2Err) {
      console.error("[CreateShare] R2 save failed. Compensating and rolling back Firestore reservation:", r2Err);
      await rollbackShareReservationFirestore(deterministicKey, id, idToken);
      return jsonResponse({ success: false, error: "Erro ao salvar arquivo de compartilhamento no armazenamento R2" }, 500);
    }
  }

  return jsonResponse({ success: true, share: { ...shareData, status: 'active' } });
}
