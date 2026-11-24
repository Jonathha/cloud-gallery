import { bytesToBase64 } from "../../../utils/crypto";
import { decryptFileKey, decryptVideoWithWorker } from "../../../utils/fileCrypto";

export async function extractVideoKeys(fileKeyCipher?: string, fileKeyIv?: string, fileSalt?: string, activeKey?: CryptoKey) {
  let fileKeyStr = "";
  let isEnvelope = false;
  if (fileKeyCipher && fileKeyIv && fileSalt && activeKey) {
    fileKeyStr = await decryptFileKey(fileKeyCipher, fileKeyIv, activeKey);
    isEnvelope = true;
  }
  let rawMasterKey = "";
  if (!isEnvelope && activeKey) {
    const rawKey = await window.crypto.subtle.exportKey('raw', activeKey);
    rawMasterKey = await bytesToBase64(new Uint8Array(rawKey));
  }
  return { fileKeyStr, isEnvelope, rawMasterKey };
}

export async function decryptVideoBuffer(params: {
  buffer?: ArrayBuffer; ciphertextBytes?: Uint8Array; ciphertextBase64?: string;
  fileSalt?: string; fileKeyStr: string; iv: string; isEnvelope: boolean; rawMasterKey: string;
}) {
  const { decryptedBuffer } = await decryptVideoWithWorker(params);
  return decryptedBuffer;
}
