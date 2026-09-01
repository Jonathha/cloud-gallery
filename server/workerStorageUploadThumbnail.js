import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { getFirestoreDocREST } from "./workerFirestoreREST.js";

export async function handleUploadThumbnail(request, env) {
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
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

  // Validate ownership in Firestore
  let isOwnerOfMedia = false;
  try {
    const imgDoc = await getFirestoreDocREST("images", id, idToken);
    if (imgDoc && imgDoc.userId === verifiedUser.uid) {
      isOwnerOfMedia = true;
    } else {
      const keyDoc = await getFirestoreDocREST("media_keys", id, idToken);
      if (keyDoc && keyDoc.userId === verifiedUser.uid) {
        isOwnerOfMedia = true;
      }
    }
  } catch (dbErr) {
    console.warn("[handleUploadThumbnail] Firestore REST verification failed:", dbErr);
  }

  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para modificar a miniatura deste arquivo." }, 403);
  }

  const buffer = await request.arrayBuffer();

  // Save to R2
  const bucket = env.R2 || env.CHAT_R2;
  if (bucket) {
    try {
      await bucket.put(`thumbnails/${id}.enc`, buffer);
    } catch (err) {
      console.error("[Worker R2] Upload thumbnail error:", err);
      return jsonResponse({ success: false, error: "Erro ao salvar miniatura no R2" }, 500);
    }
  }

  return jsonResponse({ success: true });
}

