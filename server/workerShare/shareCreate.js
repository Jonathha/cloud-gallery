import { jsonResponse } from "../workerHelpers.js";
import { authenticateShareRequest, checkMediaOwnership } from "./auth.js";
import { createShareD1, countActiveSharesD1, countActiveSharesByOwnerD1, MAX_SHARES_PER_MEDIA, MAX_ACTIVE_SHARES_PER_USER } from "../workerD1Shares.js";
import { saveShareR2, rollbackShareR2 } from "./r2.js";
import { validateCreatePayload, validateShareOptions, buildShareData } from "./shareCreateHelpers.js";

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
  const optionsError = validateShareOptions(body.options);
  if (optionsError) {
    return jsonResponse({ success: false, code: "INVALID_SHARE_OPTIONS", error: optionsError }, 400);
  }
  const { id, imageId } = body;
  const db = env.DB || env.DATABASE || env.d1;
  const bucket = env.R2;
  if (!db || !bucket) {
    return jsonResponse({ success: false, error: "Serviço de compartilhamento temporariamente indisponível." }, 503);
  }

  const isOwnerOfMedia = await checkMediaOwnership(imageId, verifiedUser.uid, idToken, env);
  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não é proprietário desta mídia." }, 403);
  }

  const limitResponse = () => jsonResponse({
    success: false,
    code: "SHARE_LIMIT_REACHED",
    limit: MAX_ACTIVE_SHARES_PER_USER,
    error: `Você já tem ${MAX_ACTIVE_SHARES_PER_USER} links ativos. Exclua um para criar outro.`
  }, 409);
  const alreadySharedResponse = () => jsonResponse({
    success: false,
    code: "MEDIA_ALREADY_SHARED",
    error: "Esta mídia já tem um link ativo."
  }, 409);

  // Fast pre-check so a blocked request never uploads a payload; the atomic INSERT in createShareD1 is the real guard.
  try {
    if (await countActiveSharesD1(db, verifiedUser.uid, imageId) >= MAX_SHARES_PER_MEDIA) return alreadySharedResponse();
    if (await countActiveSharesByOwnerD1(db, verifiedUser.uid) >= MAX_ACTIVE_SHARES_PER_USER) return limitResponse();
  } catch (err) {
    console.error("[handleCreateShare] D1 limit check failed:", err);
    return jsonResponse({ success: false, error: "Não foi possível verificar o limite de links." }, 503);
  }

  const shareData = buildShareData(body, verifiedUser.uid, Date.now());
  const deterministicKey = `${verifiedUser.uid}_${imageId}`;
  let r2State = null;
  try {
    r2State = await saveShareR2(bucket, id, deterministicKey, shareData, verifiedUser.uid, imageId);
  } catch (err) {
    console.error("[handleCreateShare] R2 save failed:", err);
    return jsonResponse({ success: false, error: "Não foi possível armazenar o compartilhamento." }, 500);
  }

  try {
    const d1Result = await createShareD1(db, {
      id, ownerId: verifiedUser.uid, imageId,
      mediaType: shareData.contentType || shareData.mediaType || "image",
      expiresAt: shareData.options?.expiresAt || null,
      isOneTime: !!shareData.options?.oneTimeView,
      passwordHash: shareData.options?.passwordHash || shareData.passwordHash || null,
      encryptedShareKey: shareData.options?.encryptedShareKey || shareData.encryptedShareKey || null,
      allowDownload: shareData.options?.allowDownload !== false
    });
    if (!d1Result?.success) {
      const rolledBack = await rollbackShareR2(bucket, id, deterministicKey, r2State);
      if (!rolledBack) console.error("[handleCreateShare] D1 failed and R2 rollback also failed.");
      if (d1Result?.code === "SHARE_LIMIT_REACHED") return limitResponse();
      if (d1Result?.code === "MEDIA_ALREADY_SHARED") return alreadySharedResponse();
      if (d1Result?.code === "DUPLICATE_ID") return jsonResponse({ success: false, error: "Identificador de compartilhamento já existe. Tente novamente." }, 409);
      return jsonResponse({ success: false, error: "Não foi possível persistir o compartilhamento." }, 500);
    }
  } catch (err) {
    console.error("[handleCreateShare] D1 save failed:", err);
    const rolledBack = await rollbackShareR2(bucket, id, deterministicKey, r2State);
    if (!rolledBack) console.error("[handleCreateShare] D1 failed and R2 rollback also failed.");
    return jsonResponse({ success: false, error: "Não foi possível persistir o compartilhamento." }, 500);
  }
  return jsonResponse({ success: true, share: shareData });
}
