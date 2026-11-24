import { saveImageToCache } from "../../../utils/db";

export async function persistLoadedVideo(img: any, metadata: any, ciphertextForCache: any, cachedThumbnail: any, currentUserId?: string) {
  try {
    await saveImageToCache({
      id: img.id,
      userId: img.userId || metadata?.userId || currentUserId,
      ciphertext: ciphertextForCache,
      iv: metadata.iv || img.iv || "",
      createdAt: metadata.createdAt || Date.now(),
      isChunked: false,
      chunkCount: 1,
      contentType: metadata.contentType || "video/mp4",
      totalSize: metadata.totalSize || 0,
      thumbnailCiphertext: metadata.thumbnailCiphertext || img.thumbnailCiphertext || cachedThumbnail?.thumbnailCiphertext || "",
      thumbnailIv: metadata.thumbnailIv || img.thumbnailIv || cachedThumbnail?.thumbnailIv || "",
      fileKeyCiphertext: metadata.fileKeyCiphertext || img.fileKeyCiphertext || cachedThumbnail?.fileKeyCiphertext,
      fileKeyIv: metadata.fileKeyIv || img.fileKeyIv || cachedThumbnail?.fileKeyIv,
      fileSalt: metadata.fileSalt || img.fileSalt || cachedThumbnail?.fileSalt,
    });
  } catch (cacheErr) {
    console.warn("Silent warning: Failed to cache downloaded video locally:", cacheErr);
  }
}
