import { DecryptedImage } from "../../types";
import { bytesToBase64 } from "../../utils/crypto";
import { 
  decryptFileKey, 
  decryptVideoWithWorker, 
  registerVideoObjectURL,
  fetchRawEncryptedFile,
  unpackEncryptedFileRaw
} from "../../utils/fileCrypto";
import { saveImageToCache } from "../../utils/db";

export async function loadVideoFromRemote(
  img: DecryptedImage,
  token: string | undefined,
  activeKey: CryptoKey,
  cachedThumbnail: any,
  isPreload: boolean,
  setSelectedImage: (url: string | null) => void,
  setFullDownloadProgress: (progress: string) => void,
  getActiveId?: () => string | null
): Promise<void> {
  if (!isPreload) {
    setFullDownloadProgress("Baixando vídeo criptografado...");
  }
  const buffer = await fetchRawEncryptedFile(img.id, token);
  
  if (!isPreload) {
    setFullDownloadProgress("Descriptografando vídeo...");
  }
  const { metadata, ciphertextBytes } = unpackEncryptedFileRaw(buffer);
  
  if (metadata.ciphertext === "chunked_vault_data") {
    throw new Error("Esta mídia antiga está em um formato particionado que não é mais suportado. O arquivo completo não pode ser carregado.");
  }
  
  if (!activeKey) {
    throw new Error("Chave de criptografia não disponível.");
  }
  
  let fileKeyStr = "";
  let isEnvelope = false;
  if (metadata.fileKeyCiphertext && metadata.fileKeyIv && metadata.fileSalt) {
    fileKeyStr = await decryptFileKey(metadata.fileKeyCiphertext, metadata.fileKeyIv, activeKey);
    isEnvelope = true;
  }
  
  let rawMasterKey = "";
  if (!isEnvelope && activeKey) {
    const rawKey = await window.crypto.subtle.exportKey('raw', activeKey);
    rawMasterKey = await bytesToBase64(new Uint8Array(rawKey));
  }
  
  const ciphertextForCache = ciphertextBytes.slice();

  const { decryptedBuffer } = await decryptVideoWithWorker({
    buffer: ciphertextBytes.buffer as ArrayBuffer,
    fileSalt: metadata.fileSalt,
    fileKeyStr,
    iv: metadata.iv || (img as any).iv || "",
    isEnvelope,
    rawMasterKey
  });
  
  const blob = new Blob([decryptedBuffer], { type: metadata.contentType || "video/mp4" });
  const objectUrl = URL.createObjectURL(blob);
  registerVideoObjectURL(img.id, objectUrl);
  
  img.originalUrl = objectUrl;
  if (!isPreload) {
    if (!getActiveId || getActiveId() === img.id) {
      setSelectedImage(objectUrl);
    }
  }
  
  try {
    await saveImageToCache({
      id: img.id,
      ciphertext: ciphertextForCache,
      iv: metadata.iv || (img as any).iv || "",
      createdAt: metadata.createdAt || Date.now(),
      isChunked: false,
      chunkCount: 1,
      contentType: metadata.contentType || "video/mp4",
      totalSize: metadata.totalSize || 0,
      thumbnailCiphertext: metadata.thumbnailCiphertext || (img as any).thumbnailCiphertext || cachedThumbnail?.thumbnailCiphertext || "",
      thumbnailIv: metadata.thumbnailIv || (img as any).thumbnailIv || cachedThumbnail?.thumbnailIv || "",
      fileKeyCiphertext: metadata.fileKeyCiphertext || (img as any).fileKeyCiphertext || cachedThumbnail?.fileKeyCiphertext,
      fileKeyIv: metadata.fileKeyIv || (img as any).fileKeyIv || cachedThumbnail?.fileKeyIv,
      fileSalt: metadata.fileSalt || (img as any).fileSalt || cachedThumbnail?.fileSalt,
    });
  } catch (cacheErr) {
    console.warn("Silent warning: Failed to cache downloaded video locally:", cacheErr);
  }
}
