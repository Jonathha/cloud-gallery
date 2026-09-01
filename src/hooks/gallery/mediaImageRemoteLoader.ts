import { DecryptedImage } from "../../types";
import { decryptDataRaw } from "../../utils/crypto";
import { 
  decryptFileKey, 
  decryptWithFileKeyRaw, 
  registerImageObjectURL,
  fetchAndUnpackImage
} from "../../utils/fileCrypto";
import { saveImageToCache } from "../../utils/db";
import { handleDecryptedData } from "./mediaImageCacheLoader";

export async function loadImageFromRemote(
  img: DecryptedImage,
  token: string | undefined,
  activeKey: CryptoKey,
  cachedThumbnail: any,
  isPreload: boolean,
  setSelectedImage: (url: string | null) => void,
  getActiveId?: () => string | null
): Promise<void> {
  const fileData = await fetchAndUnpackImage(img.id, token);
  let decryptedUrl = "";

  if (fileData.ciphertext === "chunked_vault_data") {
    throw new Error("Esta mídia antiga está em um formato particionado que não é mais suportado. O arquivo completo não pode ser carregado.");
  }

  if (!activeKey) {
    throw new Error("Chave de criptografia não disponível.");
  }

  if (fileData.fileKeyCiphertext && fileData.fileKeyIv && fileData.fileSalt) {
    try {
      const fileKeyStr = await decryptFileKey(fileData.fileKeyCiphertext, fileData.fileKeyIv, activeKey);
      const decryptedBuffer = await decryptWithFileKeyRaw(fileData.ciphertext, fileData.iv, fileKeyStr, fileData.fileSalt);
      decryptedUrl = handleDecryptedData(decryptedBuffer, fileData.contentType || "image/jpeg");
    } catch (e) {
      console.warn("Remote envelope decryption failed, attempting direct key fallback...", e);
      try {
        const decryptedBuffer = await decryptDataRaw(fileData.ciphertext, fileData.iv, activeKey);
        decryptedUrl = handleDecryptedData(decryptedBuffer, fileData.contentType || "image/jpeg");
      } catch (fallbackErr) {
        console.warn("Remote direct decryption failed.", fallbackErr);
      }
    }
  } else if (fileData.ciphertext && fileData.iv) {
    try {
      const decryptedBuffer = await decryptDataRaw(fileData.ciphertext, fileData.iv, activeKey);
      decryptedUrl = handleDecryptedData(decryptedBuffer, fileData.contentType || "image/jpeg");
    } catch (e) {
      console.warn("Remote direct decryption failed", e);
    }
  }

  if (!decryptedUrl) {
    throw new Error("Não foi possível descriptografar a mídia do cofre.");
  }

  registerImageObjectURL(img.id, decryptedUrl);
  img.originalUrl = decryptedUrl;
  if (!isPreload) {
    if (!getActiveId || getActiveId() === img.id) {
      setSelectedImage(decryptedUrl);
    }
  }

  try {
    await saveImageToCache({
      id: img.id,
      ciphertext: fileData.ciphertext,
      iv: fileData.iv,
      createdAt: fileData.createdAt,
      isChunked: false,
      chunkCount: 1,
      contentType: fileData.contentType || "image/png",
      totalSize: fileData.totalSize || 0,
      thumbnailCiphertext: fileData.thumbnailCiphertext || (img as any).thumbnailCiphertext || cachedThumbnail?.thumbnailCiphertext || "",
      thumbnailIv: fileData.thumbnailIv || (img as any).thumbnailIv || cachedThumbnail?.thumbnailIv || "",
      fileKeyCiphertext: fileData.fileKeyCiphertext || (img as any).fileKeyCiphertext || cachedThumbnail?.fileKeyCiphertext,
      fileKeyIv: fileData.fileKeyIv || (img as any).fileKeyIv || cachedThumbnail?.fileKeyIv,
      fileSalt: fileData.fileSalt || (img as any).fileSalt || cachedThumbnail?.fileSalt,
    });
  } catch (cacheErr) {
    console.warn("Silent warning: Failed to cache downloaded image locally:", cacheErr);
  }
}
