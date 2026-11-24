import { bytesToBase64, decryptDataRaw } from "../../../utils/crypto";
import { decryptFileKey, decryptMediaWithWorker, decryptWithFileKeyRaw, decryptedBufferToBlobUrlAsync } from "../../../utils/fileCrypto";

export async function handleDecryptedData(decryptedBuffer: ArrayBuffer, contentType: string): Promise<string> {
  return await decryptedBufferToBlobUrlAsync(decryptedBuffer, contentType);
}

export async function decryptImageCipher(
  ciphertext: string, iv: string, contentType: string,
  fileKeyCipher?: string, fileKeyIv?: string, fileSalt?: string, activeKey?: CryptoKey
): Promise<string> {
  if (fileKeyCipher && fileKeyIv && fileSalt && activeKey) {
    try {
      const fileKeyStr = await decryptFileKey(fileKeyCipher, fileKeyIv, activeKey);
      try {
        const { decryptedBuffer } = await decryptMediaWithWorker({
          ciphertextBase64: ciphertext,
          fileSalt,
          fileKeyStr,
          iv,
          isEnvelope: true,
        });
        return await handleDecryptedData(decryptedBuffer, contentType);
      } catch {
        const buf = await decryptWithFileKeyRaw(ciphertext, iv, fileKeyStr, fileSalt);
        return await handleDecryptedData(buf, contentType);
      }
    } catch {
      try {
        const buf = await decryptDataRaw(ciphertext, iv, activeKey);
        return await handleDecryptedData(buf, contentType);
      } catch { return ""; }
    }
  }
  if (activeKey && ciphertext && iv) {
    try {
      try {
        const rawKey = await window.crypto.subtle.exportKey('raw', activeKey);
        const rawMasterKey = await bytesToBase64(new Uint8Array(rawKey));
        const { decryptedBuffer } = await decryptMediaWithWorker({
          ciphertextBase64: ciphertext,
          iv,
          isEnvelope: false,
          rawMasterKey,
        });
        return await handleDecryptedData(decryptedBuffer, contentType);
      } catch {
        const buf = await decryptDataRaw(ciphertext, iv, activeKey);
        return await handleDecryptedData(buf, contentType);
      }
    } catch { return ""; }
  }
  return "";
}
