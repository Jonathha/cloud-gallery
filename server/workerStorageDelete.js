import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { deleteUserMediaItem } from "./workerD1Storage.js";
import { checkMediaOwnershipWorker } from "./workerStorageUtils.js";

export async function handleDeleteImage(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id) {
    return jsonResponse({ success: false, error: "Invalid ID" }, 400);
  }

  const authHeader = request.headers.get("Authorization");
  let verifiedUser;
  try {
    verifiedUser = await validateBanco1Token(authHeader);
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const bucket = env.R2 || env.CHAT_R2;

  // Validate ownership across D1 and R2
  const ownership = await checkMediaOwnershipWorker(id, verifiedUser.uid, authHeader, bucket, env.DB);
  if (ownership.exists && !ownership.allowed) {
    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para excluir esta mídia." }, 403);
  }

  if (!ownership.exists) {
    return jsonResponse({ success: true, message: "Mídia já excluída ou não encontrada." });
  }

  // Delete orphaned shares in R2 and D1
  const deterministicKey = `${verifiedUser.uid}_${id}`;
  let shareIdToDelete = null;

  if (bucket) {
    try {
      const activeObj = await bucket.get(`active_shares/${deterministicKey}.json`);
      if (activeObj) {
        const activeData = await activeObj.json();
        if (activeData && (activeData.shareId || activeData.id)) {
          shareIdToDelete = activeData.shareId || activeData.id;
        }
      }
    } catch (e) {
      console.warn("[Worker] Failed to check active_shares in R2:", e);
    }
  }

  if (shareIdToDelete && bucket) {
    try {
      await bucket.delete(`shares/${shareIdToDelete}.json`);
      await bucket.delete(`active_shares/${deterministicKey}.json`);
    } catch (e) {
      console.warn("[Worker R2] Failed deleting shares:", e);
    }
  }

  // Delete from R2
  if (bucket) {
    try {
      await bucket.delete(`images/${id}.json`);
      await bucket.delete(`images/${id}.enc`);
      await bucket.delete(`thumbnails/${id}.enc`);
      console.log(`[Worker R2] Deleted ${id} from R2`);
    } catch (r2DelErr) {
      console.error(`[Worker R2] Failed deleting ${id} from R2:`, r2DelErr);
      // Keep the D1 record so the client can retry; otherwise the R2 object would be orphaned.
      return jsonResponse({ success: false, error: "Falha ao excluir a mídia do armazenamento. Tente novamente." }, 500);
    }
  }

  // Delete from D1 user metadata store
  if (env.DB) {
    try {
      await deleteUserMediaItem(env.DB, verifiedUser.uid, id);
      console.log(`[Worker D1] Deleted ${id} from user metadata store`);
    } catch (d1DelErr) {
      console.warn(`[Worker D1] Failed deleting ${id} from D1:`, d1DelErr);
    }
  }

  return jsonResponse({ success: true });
}


