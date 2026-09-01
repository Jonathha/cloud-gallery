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

export async function checkMediaOwnershipWorker(id, authUid, authHeader, bucket) {
  if (!id || !authUid) return { exists: false, allowed: false };

  // 1. Check Cloudflare R2
  if (bucket) {
    try {
      const r2Obj = await bucket.get(`images/${id}.enc`);
      if (r2Obj) {
        const r2Data = await r2Obj.arrayBuffer();
        if (r2Data && r2Data.byteLength > 0) {
          const userIdFromPayload = getUserIdFromPayload(r2Data);
          if (userIdFromPayload && userIdFromPayload !== authUid) {
            return { exists: true, allowed: false };
          }
          return { exists: true, allowed: true };
        }
      }
    } catch (e) {}

    try {
      const r2ObjJson = await bucket.get(`images/${id}.json`);
      if (r2ObjJson) {
        const r2DataText = await r2ObjJson.text();
        if (r2DataText) {
          const userIdFromPayload = getUserIdFromPayload(r2DataText);
          if (userIdFromPayload && userIdFromPayload !== authUid) {
            return { exists: true, allowed: false };
          }
          return { exists: true, allowed: true };
        }
      }
    } catch (e) {}
  }

  // 2. Check Firestore using user's token
  if (authHeader) {
    try {
      const { getFirestoreDocREST } = await import("./workerFirestoreREST.js");
      const imgDoc = await getFirestoreDocREST('images', id, authHeader);
      if (imgDoc && imgDoc.userId && imgDoc.userId !== authUid) {
        return { exists: true, allowed: false };
      }
      const keyDoc = await getFirestoreDocREST('media_keys', id, authHeader);
      if (keyDoc && keyDoc.userId && keyDoc.userId !== authUid) {
        return { exists: true, allowed: false };
      }
    } catch (dbErr) {
      if (dbErr && dbErr.message && (dbErr.message.includes('403') || dbErr.message.includes('PERMISSION_DENIED'))) {
        return { exists: true, allowed: false };
      }
      throw new Error(`Erro ao verificar permissão no Firestore: ${dbErr.message}`);
    }
  }
  return { exists: false, allowed: true };
}
