import { decryptFileKey, decryptWithFileKeyRaw } from "../../../../utils/fileCrypto";
import { saveImageToCache } from "../../../../utils/db";

export async function validateAndSaveSyncItem(item: any, fileData: any, cryptoKey?: CryptoKey | null, currentUserId?: string) {
  if (cryptoKey && item.fileKeyCiphertext && item.fileKeyIv && item.fileSalt) {
    try {
      const keyStr = await decryptFileKey(item.fileKeyCiphertext, item.fileKeyIv, cryptoKey);
      await decryptWithFileKeyRaw(fileData.ciphertext, fileData.iv, keyStr, item.fileSalt);
    } catch {
      throw new Error("Falha na validação de descriptografia");
    }
  }
  const targetUserId = currentUserId || item.userId || item.uid;
  await saveImageToCache({
    id: item.id, userId: targetUserId, ciphertext: fileData.ciphertext, iv: fileData.iv,
    createdAt: fileData.createdAt || item.createdAt || Date.now(), isChunked: false, chunkCount: 1,
    contentType: fileData.contentType || item.contentType || "image/png", totalSize: fileData.totalSize || item.totalSize || 0,
    thumbnailCiphertext: fileData.thumbnailCiphertext || item.thumbnailCiphertext || "",
    thumbnailIv: fileData.thumbnailIv || item.thumbnailIv || "",
    fileKeyCiphertext: fileData.fileKeyCiphertext || item.fileKeyCiphertext,
    fileKeyIv: fileData.fileKeyIv || item.fileKeyIv,
    fileSalt: fileData.fileSalt || item.fileSalt,
  });
}
