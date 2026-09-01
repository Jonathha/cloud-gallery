import { jsonResponse, corsHeaders } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { isEncBinary, wrapJsonToEnc, getUserIdFromPayload } from "./workerStorageUtils.js";
import { getFirestoreDocREST } from "./workerFirestoreREST.js";

export async function handleGetImage(request, env) {
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
    console.warn('[handleGetImage] Firestore REST verification failed:', dbErr);
  }

  // Try fetching file from R2 bucket
  const bucket = env.R2 || env.CHAT_R2;
  if (!bucket) {
    return jsonResponse({ success: false, error: "Armazenamento R2 não configurado" }, 500);
  }

  let buffer;
  try {
    let obj = await bucket.get(`images/${id}.enc`);
    if (obj) {
      buffer = await obj.arrayBuffer();
    } else {
      obj = await bucket.get(`images/${id}.json`);
      if (obj) {
        const val = await obj.text();
        const fileData = JSON.parse(val);
        buffer = wrapJsonToEnc(fileData);
      }
    }
  } catch (r2Err) {
    console.error(`[Worker R2] Failed getting ${id} from R2:`, r2Err);
  }

  if (!buffer) {
    return jsonResponse({ success: false, error: "Mídia não encontrada no armazenamento R2" }, 404);
  }

  // Fallback ownership check from file payload if Firestore doc was inaccessible
  if (!isOwnerOfMedia) {
    const fileUserId = getUserIdFromPayload(buffer);
    if (fileUserId === verifiedUser.uid) {
      isOwnerOfMedia = true;
    }
  }

  if (!isOwnerOfMedia) {
    return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para visualizar este arquivo." }, 403);
  }

  // Convert on-the-fly to .enc if it is old JSON format
  if (!isEncBinary(buffer)) {
    try {
      const text = new TextDecoder().decode(buffer);
      const fileData = JSON.parse(text);
      buffer = wrapJsonToEnc(fileData);
    } catch (e) {
      return jsonResponse({ success: false, error: "Erro ao processar dados da mídia antiga." }, 500);
    }
  }

  return new Response(buffer, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${id}.enc"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
    }
  });
}


