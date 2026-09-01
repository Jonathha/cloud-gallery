import { jsonResponse } from "../workerHelpers.js";
import { isShareActive, extractIdFromUrl, isValidShareId } from "./helpers.js";
import { authenticateShareRequest, checkMediaOwnership } from "./auth.js";
import { getActiveShareFirestore, getShareDocFirestore } from "./firestore.js";
import { getShareR2, getActiveShareR2, searchSharesFallbackR2 } from "./r2.js";

export async function handleFindShare(request, env) {
  const imageId = extractIdFromUrl(request);
  if (!imageId || !isValidShareId(imageId)) {
    return jsonResponse({ success: false, error: "Invalid ID format" }, 400);
  }

  let verifiedUser, idToken;
  try {
    const authResult = await authenticateShareRequest(request);
    verifiedUser = authResult.verifiedUser;
    idToken = authResult.idToken;
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const isOwnerOfMedia = await checkMediaOwnership(imageId, verifiedUser.uid, idToken);
  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar compartilhamentos desta mídia." }, 403);
  }

  const now = Date.now();
  const deterministicKey = `${verifiedUser.uid}_${imageId}`;
  const bucket = env.R2 || env.CHAT_R2;

  // 1. Check active_shares in Firestore (primary source of truth)
  try {
    const activeDoc = await getActiveShareFirestore(deterministicKey, idToken);
    if (activeDoc && isShareActive(activeDoc, now)) {
      const activeShareId = activeDoc.shareId || activeDoc.id;
      if (activeShareId) {
        let shareDoc = await getShareDocFirestore(activeShareId, idToken);
        if (!shareDoc && bucket) {
          shareDoc = await getShareR2(bucket, activeShareId);
        }
        if (shareDoc) {
          return jsonResponse({
            success: true,
            shares: [shareDoc],
            share: shareDoc
          });
        }
      }
    }
  } catch (fsErr) {
    console.warn('[handleFindShare] Firestore active_shares check failed:', fsErr);
  }

  // 2. Fast O(1) check in R2 active_shares (for R2-first or decoupled storage)
  if (bucket) {
    try {
      const activeR2 = await getActiveShareR2(bucket, deterministicKey);
      if (activeR2 && isShareActive(activeR2, now)) {
        const activeShareId = activeR2.shareId || activeR2.id;
        if (activeShareId) {
          const shareDoc = await getShareR2(bucket, activeShareId);
          if (shareDoc) {
            return jsonResponse({
              success: true,
              shares: [shareDoc],
              share: shareDoc
            });
          }
        }
      }
    } catch (r2ActiveErr) {
      console.warn('[handleFindShare] R2 active_shares check failed:', r2ActiveErr);
    }

    // 3. Fallback search in R2 for legacy shares created before deterministic keys
    const matchingShares = await searchSharesFallbackR2(bucket, imageId, verifiedUser.uid, now);
    if (matchingShares.length > 0) {
      return jsonResponse({
        success: true,
        shares: matchingShares,
        share: matchingShares[0] || null
      });
    }
  }

  return jsonResponse({ success: true, shares: [], share: null });
}
