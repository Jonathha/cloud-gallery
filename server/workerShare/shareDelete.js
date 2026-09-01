import { jsonResponse } from "../workerHelpers.js";
import { extractIdFromUrl, isValidShareId } from "./helpers.js";
import { authenticateShareRequest } from "./auth.js";
import { getShareDocFirestore, deleteShareFirestore } from "./firestore.js";
import { getShareR2, deleteShareR2 } from "./r2.js";

export async function handleDeleteShare(request, env) {
  const shareId = extractIdFromUrl(request);
  if (!shareId || !isValidShareId(shareId)) {
    return jsonResponse({ success: false, error: "Invalid ID" }, 400);
  }

  let verifiedUser, idToken;
  try {
    const authResult = await authenticateShareRequest(request);
    verifiedUser = authResult.verifiedUser;
    idToken = authResult.idToken;
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  let deletedImageId = null;
  const bucket = env.R2 || env.CHAT_R2;

  // 1. Fetch metadata to determine ownership and imageId
  let shareData = null;
  if (idToken) {
    try {
      shareData = await getShareDocFirestore(shareId, idToken);
    } catch {}
  }

  if (!shareData && bucket) {
    shareData = await getShareR2(bucket, shareId);
  }

  if (shareData) {
    if (shareData.userId && shareData.userId !== verifiedUser.uid) {
      return jsonResponse({ success: false, error: "Acesso negado: você não é proprietário deste compartilhamento." }, 403);
    }
    if (shareData.imageId) {
      deletedImageId = shareData.imageId;
    }
  }

  const deterministicKey = deletedImageId ? `${verifiedUser.uid}_${deletedImageId}` : null;

  // 2. Atomic Firestore cleanup
  if (idToken) {
    await deleteShareFirestore(deterministicKey, shareId, idToken);
  }

  // 3. Cloudflare R2 cleanup
  if (bucket) {
    await deleteShareR2(bucket, shareId, deterministicKey);
  }

  return jsonResponse({ success: true });
}
