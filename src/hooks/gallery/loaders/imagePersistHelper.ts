import { saveImageToCache } from "../../../utils/db";

export async function persistLoadedImage(img: any, fileData: any, cachedThumb: any, currentUserId?: string) {
  try {
    await saveImageToCache({
      id: img.id,
      userId: img.userId || fileData?.userId || currentUserId,
      ciphertext: fileData.ciphertext,
      iv: fileData.iv,
      createdAt: fileData.createdAt,
      isChunked: false,
      chunkCount: 1,
      contentType: fileData.contentType || "image/png",
      totalSize: fileData.totalSize || 0,
      thumbnailCiphertext: fileData.thumbnailCiphertext || img.thumbnailCiphertext || cachedThumb?.thumbnailCiphertext || "",
      thumbnailIv: fileData.thumbnailIv || img.thumbnailIv || cachedThumb?.thumbnailIv || "",
      fileKeyCiphertext: fileData.fileKeyCiphertext || img.fileKeyCiphertext || cachedThumb?.fileKeyCiphertext,
      fileKeyIv: fileData.fileKeyIv || img.fileKeyIv || cachedThumb?.fileKeyIv,
      fileSalt: fileData.fileSalt || img.fileSalt || cachedThumb?.fileSalt,
    });
  } catch (e) {
    console.warn("Silent warning: Failed to cache downloaded image locally:", e);
  }
}
