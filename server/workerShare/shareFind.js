import { jsonResponse } from "../workerHelpers.js";
import { extractIdFromUrl, isValidShareId } from "./helpers.js";
import { authenticateShareRequest, checkMediaOwnership } from "./auth.js";
import { findSharesD1, listActiveSharesByOwnerD1, MAX_ACTIVE_SHARES_PER_USER } from "../workerD1Shares.js";

export async function handleFindShare(request, env) {
  const imageId = extractIdFromUrl(request);
  if (!imageId || !isValidShareId(imageId)) return jsonResponse({ success: false, error: "Invalid ID format" }, 400);

  let verifiedUser, idToken;
  try {
    const authResult = await authenticateShareRequest(request);
    verifiedUser = authResult.verifiedUser;
    idToken = authResult.idToken;
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const db = env.DB || env.DATABASE || env.d1;
  if (!db) return jsonResponse({ success: false, error: "Serviço de compartilhamento temporariamente indisponível." }, 503);

  // Ownership and listing run in parallel (the listing is already scoped to the caller's uid).
  const [isOwnerOfMedia, found] = await Promise.all([
    checkMediaOwnership(imageId, verifiedUser.uid, idToken, env),
    findSharesD1(db, verifiedUser.uid, imageId).then((shares) => ({ shares }), (error) => ({ error }))
  ]);
  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar compartilhamentos desta mídia." }, 403);
  }

  try {
    if (found.error) throw found.error;
    const { shares } = found;
    return jsonResponse({ success: true, shares, share: shares[0] || null, limit: MAX_ACTIVE_SHARES_PER_USER });
  } catch (err) {
    console.error("[handleFindShare] D1 check failed:", err);
    return jsonResponse({ success: false, error: "Não foi possível verificar os compartilhamentos. Tente novamente." }, 503);
  }
}

/** GET /api/share/mine — every active link of the authenticated user, across all media. */
export async function handleListMyShares(request, env) {
  let verifiedUser;
  try {
    const authResult = await authenticateShareRequest(request);
    verifiedUser = authResult.verifiedUser;
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const db = env.DB || env.DATABASE || env.d1;
  if (!db) return jsonResponse({ success: false, error: "Serviço de compartilhamento temporariamente indisponível." }, 503);

  try {
    const shares = await listActiveSharesByOwnerD1(db, verifiedUser.uid);
    return jsonResponse({ success: true, shares, limit: MAX_ACTIVE_SHARES_PER_USER });
  } catch (err) {
    console.error("[handleListMyShares] D1 list failed:", err);
    return jsonResponse({ success: false, error: "Não foi possível carregar seus links. Tente novamente." }, 503);
  }
}

