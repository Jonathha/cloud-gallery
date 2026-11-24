import { sessionDecryptedCache } from "../../galleryDecryptHelper";
import { getTimestamp } from "../../../../utils/galleryHelpers";
import { DecryptedImage } from "../../../../types";

export function splitCachedAndCold(
  listToProcess: any[], securityImageId: string | null, isExtraUnlocked: boolean | undefined, decryptedCache: Map<string, string>
) {
  const cachedItems: DecryptedImage[] = [];
  const coldItems: any[] = [];
  for (const img of listToProcess) {
    const isSecurity = img.id === securityImageId;
    const isCached = sessionDecryptedCache.has(img.id) || decryptedCache?.has(img.id);
    if (isCached || (isSecurity && !isExtraUnlocked)) {
      const url = sessionDecryptedCache.get(img.id) || decryptedCache?.get(img.id) || "";
      cachedItems.push({
        id: img.id, url, createdAt: getTimestamp(img.createdAt), isVideo: img.contentType?.startsWith('video/') || false,
        isChunked: img.isChunked || false, chunkCount: img.chunkCount || 1, contentType: img.contentType || (img.contentType?.startsWith('video/') ? 'video/mp4' : 'image/png'),
        totalSize: img.totalSize || 0, failed: !!img.failed, noThumbnail: !!img.noThumbnail, isMissing: !!img.isMissing
      } as DecryptedImage);
    } else {
      coldItems.push(img);
    }
  }
  return { cachedItems, coldItems };
}
