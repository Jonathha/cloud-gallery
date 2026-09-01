import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChat.js";
import { checkMediaOwnershipWorker } from "./workerStorageUtils.js";

function base64ToUint8Array(base64Str) {
  const binaryString = atob(base64Str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64ToUtf8(base64Str) {
  const binaryString = atob(base64Str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export async function handleUploadRawImage(request, env) {
  const authHeader = request.headers.get("Authorization");
  let verifiedUser;
  try {
    verifiedUser = await validateBanco1Token(authHeader);
  } catch (err) {
    console.warn("[UploadRaw] Authentication failed:", err.message);
    return jsonResponse({ success: false, error: `Acesso não autorizado: ${err.message}` }, 401);
  }

  const authUid = verifiedUser.uid;

  const fileKeyBase64 = request.headers.get("x-file-key");
  const fileSaltBase64 = request.headers.get("x-file-salt");
  const fileIvBase64 = request.headers.get("x-file-iv");
  const metadataBase64 = request.headers.get("x-file-metadata");

  if (!fileKeyBase64 || !fileSaltBase64 || !fileIvBase64 || !metadataBase64) {
    console.warn("[UploadRaw] Missing required headers for user:", authUid);
    return jsonResponse({ success: false, error: "Headers obrigatórios ausentes para o upload bruto" }, 400);
  }

  let metadata;
  try {
    metadata = JSON.parse(base64ToUtf8(metadataBase64));
  } catch (err) {
    console.warn("[UploadRaw] Failed to parse metadata JSON for user:", authUid);
    return jsonResponse({ success: false, error: "Metadados de cabeçalho inválidos (JSON)" }, 400);
  }

  const { id } = metadata;
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    console.warn("[UploadRaw] Invalid image ID:", id);
    return jsonResponse({ success: false, error: "ID de imagem inválido" }, 400);
  }

  // SECURITY & DATA INTEGRITY: Server is the sole authority over ownership and dates/timestamps
  const serverTimestamp = Date.now();
  metadata.userId = authUid;
  delete metadata.createdAt;
  delete metadata.timestamp;
  delete metadata.serverCreatedAt;
  delete metadata.serverTimestamp;
  metadata.createdAt = serverTimestamp;
  metadata.timestamp = serverTimestamp;

  let fileKey, isV2, saltBytes, ivBytes;
  try {
    fileKey = base64ToUtf8(fileKeyBase64);
    isV2 = fileSaltBase64 && fileSaltBase64.startsWith("v2_");
    saltBytes = isV2 ? null : base64ToUint8Array(fileSaltBase64);
    ivBytes = base64ToUint8Array(fileIvBase64);
  } catch (headerDecodeErr) {
    console.warn("[UploadRaw] Base64 header decoding error for file:", id, headerDecodeErr.message);
    return jsonResponse({ success: false, error: "Cabeçalhos codificados em Base64 inválidos" }, 400);
  }

  const rawBuffer = await request.arrayBuffer();
  if (!rawBuffer || rawBuffer.byteLength === 0) {
    console.warn("[UploadRaw] Empty file buffer received for file:", id);
    return jsonResponse({ success: false, error: "Arquivo enviado está vazio" }, 400);
  }

  const contentType = metadata.contentType || "application/octet-stream";

  let encBuffer;
  const view = new DataView(rawBuffer);
  const isAlreadyPacked = rawBuffer.byteLength >= 8 &&
    view.getUint8(0) === 0x45 && view.getUint8(1) === 0x4e && view.getUint8(2) === 0x43; // 'ENC'

  if (isAlreadyPacked) {
    encBuffer = rawBuffer;
  } else {
    // Web Crypto PBKDF2 + AES-GCM Encryption
    let encryptedArrayBuffer;
    try {
      let aesKey;
      if (isV2) {
        const enc = new TextEncoder();
        const fileKeyBytes = enc.encode(fileKey);
        const hashBuffer = await crypto.subtle.digest("SHA-256", fileKeyBytes);
        aesKey = await crypto.subtle.importKey(
          "raw",
          hashBuffer,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt"]
        );
      } else {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          enc.encode(fileKey),
          { name: "PBKDF2" },
          false,
          ["deriveKey"]
        );

        aesKey = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: saltBytes,
            iterations: 100000,
            hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt"]
        );
      }

      encryptedArrayBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: ivBytes },
        aesKey,
        rawBuffer
      );
    } catch (cryptoErr) {
      console.error("[UploadRaw] Cryptography error for file:", id, cryptoErr);
      return jsonResponse({ success: false, error: `Erro de criptografia: ${cryptoErr.message}` }, 500);
    }

    // Update metadata fields
    metadata.contentType = contentType;
    metadata.totalSize = rawBuffer.byteLength;
    metadata.iv = fileIvBase64;

    // Convert thumbnail base64 to binary bytes if present
    let thumbBytes = new Uint8Array(0);
    if (metadata.thumbnailCiphertext) {
      try {
        const binaryStr = atob(metadata.thumbnailCiphertext);
        thumbBytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          thumbBytes[i] = binaryStr.charCodeAt(i);
        }
      } catch (e) {
        console.warn("[UploadRaw] Failed to decode thumbnailCiphertext base64:", e);
      }
    }

    const mediaBytes = new Uint8Array(encryptedArrayBuffer);

    // Pack into ENC2 format
    metadata.version = 2;
    metadata.thumbSize = thumbBytes.byteLength;
    metadata.mediaSize = mediaBytes.byteLength;

    const metaStr = JSON.stringify(metadata);
    const metaBytes = new TextEncoder().encode(metaStr);

    const header = new ArrayBuffer(8);
    const headerView = new DataView(header);
    headerView.setUint8(0, 0x45); // E
    headerView.setUint8(1, 0x4E); // N
    headerView.setUint8(2, 0x43); // C
    headerView.setUint8(3, 0x32); // 2 ('ENC2')
    headerView.setUint32(4, metaBytes.length, false);

    const totalLen = 8 + metaBytes.length + thumbBytes.byteLength + mediaBytes.byteLength;
    const finalEncBytes = new Uint8Array(totalLen);
    finalEncBytes.set(new Uint8Array(header), 0);
    finalEncBytes.set(metaBytes, 8);
    if (thumbBytes.byteLength > 0) {
      finalEncBytes.set(thumbBytes, 8 + metaBytes.length);
    }
    finalEncBytes.set(mediaBytes, 8 + metaBytes.length + thumbBytes.byteLength);

    encBuffer = finalEncBytes.buffer;
  }

  try {
    // PRIMARY STORAGE: Save to Cloudflare R2
    const bucket = env.R2 || env.CHAT_R2;
    if (!bucket) {
      console.error("[UploadRaw] Neither R2 nor CHAT_R2 binding is available in environment");
      return jsonResponse({ success: false, error: "Serviço de armazenamento (R2) indisponível" }, 500);
    }

    const ownership = await checkMediaOwnershipWorker(id, authUid, authHeader, bucket);
    if (ownership.exists && !ownership.allowed) {
      return jsonResponse({ success: false, error: "Conflito: A mídia já existe e não pertence ao usuário." }, 409);
    }

    await bucket.put(`images/${id}.enc`, encBuffer, {
      httpMetadata: { contentType: "application/octet-stream" }
    });
    console.log(`[UploadRaw] Successfully uploaded images/${id}.enc to R2 bucket for user: ${authUid}`);

    return jsonResponse({
      success: true,
      id,
      processedSize: rawBuffer.byteLength,
      contentType,
      createdAt: serverTimestamp,
      timestamp: serverTimestamp
    });
  } catch (err) {
    console.error(`[UploadRaw] Error saving raw image ${id} for user ${authUid}:`, err);
    return jsonResponse({ success: false, error: `Upload error: ${err.message}` }, 500);
  }
}

