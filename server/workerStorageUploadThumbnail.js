import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { checkMediaOwnershipWorker } from "./workerStorageUtils.js";
import { findUserMediaItem } from "./workerD1Storage.js";

const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; // 10MB max per thumbnail

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

  const bucket = env.R2 || env.CHAT_R2;

  // Validate ownership across D1 and R2
  let isAuthorized = false;
  if (env.DB) {
    try {
      const d1Item = await findUserMediaItem(env.DB, verifiedUser.uid, id);
      if (d1Item) {
        isAuthorized = true;
      }
    } catch (d1Err) {
      console.warn("[Worker] D1 upload thumbnail check warning:", d1Err);
    }
  }

  if (!isAuthorized) {
    const ownership = await checkMediaOwnershipWorker(id, verifiedUser.uid, authHeader, bucket, env.DB);
    if (!ownership.allowed) {
      return jsonResponse({ success: false, error: "Acesso negado: você não tem permissão para modificar a miniatura deste arquivo." }, 403);
    }
  }

  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_THUMBNAIL_SIZE) {
    return jsonResponse({ success: false, error: "Miniatura excede o tamanho máximo permitido (10MB)." }, 413);
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength > MAX_THUMBNAIL_SIZE) {
    return jsonResponse({ success: false, error: "Miniatura excede o tamanho máximo permitido (10MB)." }, 413);
  }

  // Save to R2
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

