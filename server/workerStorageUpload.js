import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { isEncBinary, wrapJsonToEnc, checkMediaOwnershipWorker } from "./workerStorageUtils.js";

const MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB max per upload

export async function handleUploadImage(request, env) {
  const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_UPLOAD_SIZE) {
    return jsonResponse({ success: false, error: "Arquivo excede o tamanho máximo permitido (100MB)." }, 413);
  }

  let buffer = await request.arrayBuffer();
  if (buffer.byteLength > MAX_UPLOAD_SIZE) {
    return jsonResponse({ success: false, error: "Arquivo excede o tamanho máximo permitido (100MB)." }, 413);
  }

  let metadata;

  if (!isEncBinary(buffer)) {
    // Try to parse as JSON (old format)
    try {
      const text = new TextDecoder().decode(buffer);
      const fileData = JSON.parse(text);
      metadata = fileData;
      buffer = wrapJsonToEnc(fileData);
    } catch (e) {
      return jsonResponse({ success: false, error: "Formato inválido: esperava arquivo .enc binário ou JSON válido." }, 400);
    }
  } else {
    // Extract metadata from .enc
    try {
      const view = new DataView(buffer);
      const metaLen = view.getUint32(4, false);
      const metaBytes = new Uint8Array(buffer, 8, metaLen);
      metadata = JSON.parse(new TextDecoder().decode(metaBytes));
    } catch (err) {
      return jsonResponse({ success: false, error: "Erro ao extrair metadados do arquivo .enc" }, 400);
    }
  }

  const { id, userId } = metadata;
  
  if (!id || !userId || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return jsonResponse({ success: false, error: "Metadados incompletos ou ID inválido no arquivo .enc" }, 400);
  }

  const authHeader = request.headers.get("Authorization");
  let verifiedUser;
  try {
    verifiedUser = await validateBanco1Token(authHeader);
  } catch (err) {
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const authenticatedUserId = verifiedUser.uid;
  if (userId !== authenticatedUserId) {
    return jsonResponse({ success: false, error: "Acesso negado: userId nos metadados não corresponde ao usuário autenticado." }, 403);
  }
  const serverTimestamp = Date.now();

  // Strip client dates and set authoritative server timestamp
  delete metadata.createdAt;
  delete metadata.timestamp;
  delete metadata.serverCreatedAt;
  delete metadata.serverTimestamp;
  metadata.createdAt = serverTimestamp;
  metadata.timestamp = serverTimestamp;

  try {
    const bucket = env.R2 || env.CHAT_R2;
    if (!bucket) {
      return jsonResponse({ success: false, error: "Armazenamento R2 não configurado" }, 500);
    }

    const ownership = await checkMediaOwnershipWorker(id, authenticatedUserId, authHeader, bucket);
    if (ownership.exists && !ownership.allowed) {
      return jsonResponse({ success: false, error: "Conflito: A mídia já existe e não pertence ao usuário." }, 409);
    }

    await bucket.put(`images/${id}.enc`, buffer, {
      httpMetadata: { contentType: "application/octet-stream" }
    });
    console.log(`[WorkerUpload] Uploaded images/${id}.enc to R2 bucket for user ${authenticatedUserId}`);

    return jsonResponse({
      success: true,
      id,
      createdAt: serverTimestamp,
      timestamp: serverTimestamp,
      syncedToDrive: false
    });
  } catch (err) {
    console.error("Upload Error:", err);
    return jsonResponse({ success: false, error: `Upload error: ${err.message}` }, 500);
  }
}

