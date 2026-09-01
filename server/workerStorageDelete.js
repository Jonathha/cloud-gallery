import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { getFirestoreDocREST, deleteFirestoreDocREST } from "./workerFirestoreREST.js";

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
  const idToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : "";
  if (!idToken) {
    return jsonResponse({ success: false, error: "Acesso não autorizado: token de sessão ausente" }, 401);
  }

  // Validate ownership in Firestore (the source of truth) using the user's authentic token
  let isOwnerOfMedia = false;
  try {
    const imgDoc = await getFirestoreDocREST('images', id, idToken);
    if (imgDoc && imgDoc.userId === verifiedUser.uid) {
      isOwnerOfMedia = true;
    } else {
      const keyDoc = await getFirestoreDocREST('media_keys', id, idToken);
      if (keyDoc && keyDoc.userId === verifiedUser.uid) {
        isOwnerOfMedia = true;
      }
    }
  } catch (dbErr) {
    console.warn('[handleDeleteImage] Firestore REST verification failed:', dbErr);
  }

  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para excluir esta mídia." }, 403);
  }

  // Delete orphaned shares
  const deterministicKey = `${verifiedUser.uid}_${id}`;
  let shareIdToDelete = null;

  try {
    const activeDoc = await getFirestoreDocREST('active_shares', deterministicKey, idToken);
    if (activeDoc && (activeDoc.shareId || activeDoc.id)) {
      shareIdToDelete = activeDoc.shareId || activeDoc.id;
    }
  } catch (e) {
    console.warn("[Worker] Failed to check active_shares in Firestore:", e);
  }

  const bucket = env.R2 || env.CHAT_R2;

  if (!shareIdToDelete && bucket) {
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

  if (shareIdToDelete) {
     if (bucket) {
       try {
         await bucket.delete(`shares/${shareIdToDelete}.json`);
         await bucket.delete(`active_shares/${deterministicKey}.json`);
       } catch (e) {
         console.warn("[Worker R2] Failed deleting shares:", e);
       }
     }
     try {
       await deleteFirestoreDocREST('shares', shareIdToDelete, idToken);
       await deleteFirestoreDocREST('active_shares', deterministicKey, idToken);
     } catch (e) {
       console.warn("[Worker Firestore] Failed deleting shares:", e);
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
    }
  }

  // Delete from Firestore (source of truth)
  try {
    await deleteFirestoreDocREST('images', id, idToken);
    await deleteFirestoreDocREST('media_keys', id, idToken);
    console.log(`[Worker Firestore] Deleted ${id} from Firestore`);
  } catch (fsDelErr) {
    console.warn(`[Worker Firestore] Failed deleting ${id} from Firestore:`, fsDelErr.message);
  }

  return jsonResponse({ success: true });
}


