import { DecryptedImage } from '../../types';
import { getTimestamp } from '../../utils/galleryHelpers';
import { sessionDecryptedCache } from './decrypt/sessionCache';
import { decryptSecurityImageThumbnail } from './decrypt/securityThumbnail';
import { decryptStandardThumbnail } from './decrypt/standardThumbnailDecrypt';
import { isQuickAccessEnabled, getActiveQuickAccessUid } from '../../utils/quickAccess';
import { getQuickAccessThumbnail } from '../../utils/quickAccessCache';

export * from './decrypt/sessionCache';

const inFlightThumbnailDecrypts = new Map<string, Promise<DecryptedImage>>();

export async function decryptSingleThumbnail(
  img: any, securityImageId: string | null | undefined,
  isExtraUnlocked: boolean | undefined, extraPassword: string | null | undefined,
  cryptoKey: CryptoKey | null | undefined, decryptedCache: Map<string, string>
): Promise<DecryptedImage> {
  const createdAt = getTimestamp(img.createdAt);
  const isVideo = img.contentType?.startsWith('video/') || false;
  const isChunked = img.isChunked || false;
  const chunkCount = img.chunkCount || 1;
  const contentType = img.contentType || (isVideo ? 'video/mp4' : 'image/png');
  const totalSize = img.totalSize || 0;
  const base = { id: img.id, createdAt, isVideo, isChunked, chunkCount, contentType, totalSize };

  if (img.id === securityImageId) {
    if (!isExtraUnlocked) return { ...base, url: '', failed: false, noThumbnail: false };
    const sec = await decryptSecurityImageThumbnail(img, extraPassword, decryptedCache);
    return { ...base, ...sec };
  }
  if (sessionDecryptedCache.has(img.id) || decryptedCache?.has(img.id)) {
    return { ...base, url: sessionDecryptedCache.get(img.id) || decryptedCache.get(img.id)!, failed: false, noThumbnail: false };
  }

  // Reuse existing in-flight decryption promise if same item is already being decrypted
  if (inFlightThumbnailDecrypts.has(img.id)) {
    return inFlightThumbnailDecrypts.get(img.id)!;
  }

  const decryptPromise = (async () => {
    const qaUid = img.userId || getActiveQuickAccessUid();
    if (cryptoKey && qaUid && isQuickAccessEnabled(qaUid)) {
      const qaCached = await getQuickAccessThumbnail(img.id, cryptoKey, qaUid);
      if (qaCached && qaCached.url) {
        sessionDecryptedCache.set(img.id, qaCached.url);
        if (decryptedCache) decryptedCache.set(img.id, qaCached.url);
        return { ...base, url: qaCached.url, failed: false, noThumbnail: false };
      }
    }
    const std = await decryptStandardThumbnail(img, cryptoKey, decryptedCache);
    return { ...base, ...std };
  })().finally(() => {
    inFlightThumbnailDecrypts.delete(img.id);
  });

  inFlightThumbnailDecrypts.set(img.id, decryptPromise);
  return decryptPromise;
}
