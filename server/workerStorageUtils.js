import { validateBanco1Token } from "./workerChatAuth.js";
import { findUserMediaItem } from "./workerD1Storage.js";

export async function validateFirebaseTokenWorker(request) {
  const authHeader = request?.headers?.get("Authorization");
  if (!authHeader) {
    return { authenticated: false, error: "Cabeçalho de autorização ausente" };
  }
  try {
    const verifiedUser = await validateBanco1Token(authHeader);
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
    return {
      authenticated: true,
      user: verifiedUser,
      uid: verifiedUser.uid,
      token
    };
  } catch (err) {
    return { authenticated: false, error: err.message };
  }
}

export function wrapJsonToEnc(fileData) {
  const { ciphertext, ...metadata } = fileData;
  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(JSON.stringify(metadata));
  
  const binaryStr = atob(ciphertext || "");
  const ciphertextBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    ciphertextBytes[i] = binaryStr.charCodeAt(i);
  }
  
  const totalLength = 4 + 4 + metaBytes.byteLength + ciphertextBytes.byteLength;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  
  // Magic 'ENC1'
  view.setUint8(0, 0x45);
  view.setUint8(1, 0x4e);
  view.setUint8(2, 0x43);
  view.setUint8(3, 0x31);
  
  view.setUint32(4, metaBytes.byteLength, false);
  
  const uint8 = new Uint8Array(buffer);
  uint8.set(metaBytes, 8);
  uint8.set(ciphertextBytes, 8 + metaBytes.byteLength);
  
  return buffer;
}

export function isEncBinary(buffer) {
  if (!buffer || buffer.byteLength < 8) return false;
  const view = new DataView(buffer);
  const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
  return magic === 0x454e4331 || magic === 0x454e4332; // 'ENC1' ou 'ENC2'
}

export function getUserIdFromPayload(bufferOrString) {
  if (!bufferOrString) return null;
  
  if (typeof bufferOrString === "string") {
    try {
      const data = JSON.parse(bufferOrString);
      return data.userId;
    } catch (e) {
      return null;
    }
  }

  // Se for ArrayBuffer (formato .enc binário ENC1 ou ENC2)
  try {
    if (bufferOrString.byteLength < 8) return null;
    const view = new DataView(bufferOrString);
    const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
    
    if (magic === 0x454e4331 || magic === 0x454e4332) {
      const metaLen = view.getUint32(4, false);
      if (8 + metaLen <= bufferOrString.byteLength) {
        const metaBytes = new Uint8Array(bufferOrString, 8, metaLen);
        const text = new TextDecoder().decode(metaBytes);
        const data = JSON.parse(text);
        return data.userId || null;
      }
    }

    // Fallback: se não for ENC1/ENC2, tenta ver se é o JSON antigo inteiro como buffer
    const text = new TextDecoder().decode(bufferOrString);
    const data = JSON.parse(text);
    return data.userId || null;
  } catch (e) {
    return null;
  }
}

export async function checkMediaOwnershipWorker(id, authUid, authHeader, bucket, db) {
  if (!id || !authUid) return { exists: false, allowed: false, isOwner: false };

  // 1. Check Cloudflare D1 first (source of truth for metadata)
  if (db) {
    try {
      const d1Item = await findUserMediaItem(db, authUid, id);
      if (d1Item) {
        return { exists: true, allowed: true, isOwner: true };
      }
    } catch (d1Err) {
      console.warn("[Worker] D1 ownership check warning:", d1Err);
    }
  }

  // 2. Check Cloudflare R2
  if (bucket) {
    try {
      // R2 is only a fallback for legacy/recovery states where the object exists
      // but D1 metadata is not available yet. Read only the ENC header/metadata.
      const r2Obj = await bucket.get(`images/${id}.enc`, {
        range: { offset: 0, length: 262152 }
      });
      if (r2Obj) {
        const r2Data = await r2Obj.arrayBuffer();
        if (r2Data && r2Data.byteLength > 0) {
          const userIdFromPayload = getUserIdFromPayload(r2Data);
          if (userIdFromPayload && userIdFromPayload === authUid) {
            return { exists: true, allowed: true, isOwner: true };
          }
          return { exists: true, allowed: false, isOwner: false };
        }
      }
    } catch (e) {
      // Fail closed: if ownership can't be verified, deny instead of treating the media as nonexistent.
      console.warn("[Worker] R2 ownership check failed:", e);
      return { exists: true, allowed: false, isOwner: false };
    }

    try {
      const r2ObjJson = await bucket.get(`images/${id}.json`);
      if (r2ObjJson) {
        const r2DataText = await r2ObjJson.text();
        if (r2DataText) {
          const userIdFromPayload = getUserIdFromPayload(r2DataText);
          if (userIdFromPayload && userIdFromPayload === authUid) {
            return { exists: true, allowed: true, isOwner: true };
          }
          return { exists: true, allowed: false, isOwner: false };
        }
      }
    } catch (e) {
      // Fail closed: if ownership can't be verified, deny instead of treating the media as nonexistent.
      console.warn("[Worker] R2 ownership check failed:", e);
      return { exists: true, allowed: false, isOwner: false };
    }

    // Check if thumbnail exists in R2
    try {
      const thumbObj = await bucket.get(`thumbnails/${id}.enc`);
      if (thumbObj) {
        // Thumbnail exists but requester has NOT proven ownership
        return { exists: true, allowed: false, isOwner: false };
      }
    } catch (e) {
      // Fail closed: if ownership can't be verified, deny instead of treating the media as nonexistent.
      console.warn("[Worker] R2 ownership check failed:", e);
      return { exists: true, allowed: false, isOwner: false };
    }
  }

  return { exists: false, allowed: false, isOwner: false };
}

export function parseAndValidateEncStructureWorker(buffer) {
  if (!buffer || buffer.byteLength < 8) {
    return { isEnc: false, isValid: false };
  }

  const view = new DataView(buffer);
  const magic = (view.getUint8(0) << 24) | (view.getUint8(1) << 16) | (view.getUint8(2) << 8) | view.getUint8(3);
  if (magic !== 0x454e4331 && magic !== 0x454e4332) {
    return { isEnc: false, isValid: false };
  }

  const metaLen = view.getUint32(4, false);
  if (metaLen <= 0 || metaLen > 262144 || 8 + metaLen > buffer.byteLength) {
    return { isEnc: true, isValid: false, error: "Tamanho de metadados inválido ou truncado" };
  }

  let metadata;
  try {
    const metaBytes = new Uint8Array(buffer, 8, metaLen);
    const metaString = new TextDecoder().decode(metaBytes);
    metadata = JSON.parse(metaString);
  } catch {
    return { isEnc: true, isValid: false, error: "JSON de metadados inválido" };
  }

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { isEnc: true, isValid: false, error: "Metadados inválidos" };
  }

  if (!metadata.id || typeof metadata.id !== "string") {
    return { isEnc: true, isValid: false, error: "ID ausente ou inválido nos metadados" };
  }

  if (!metadata.userId || typeof metadata.userId !== "string") {
    return { isEnc: true, isValid: false, error: "userId ausente ou inválido nos metadados" };
  }

  if (!metadata.iv || typeof metadata.iv !== "string") {
    return { isEnc: true, isValid: false, error: "iv ausente ou inválido nos metadados" };
  }

  if (magic === 0x454e4331) {
    if (buffer.byteLength <= 8 + metaLen) {
      return { isEnc: true, isValid: false, error: "Ciphertext ausente no arquivo ENC1" };
    }
    return { isEnc: true, isValid: true, version: 1, metadata };
  }

  if (magic === 0x454e4332) {
    const thumbSize = metadata.thumbSize;
    const mediaSize = metadata.mediaSize;

    if (typeof thumbSize !== "number" || !Number.isInteger(thumbSize) || thumbSize < 0) {
      return { isEnc: true, isValid: false, error: "thumbSize inválido no arquivo ENC2" };
    }
    if (typeof mediaSize !== "number" || !Number.isInteger(mediaSize) || mediaSize < 0) {
      return { isEnc: true, isValid: false, error: "mediaSize inválido no arquivo ENC2" };
    }

    const expectedLength = 8 + metaLen + thumbSize + mediaSize;
    if (buffer.byteLength !== expectedLength) {
      return { isEnc: true, isValid: false, error: "Tamanho do buffer incompatível com metadados do ENC2" };
    }

    return { isEnc: true, isValid: true, version: 2, metadata };
  }

  return { isEnc: false, isValid: false };
}

