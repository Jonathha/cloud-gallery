import { User } from 'firebase/auth';
import { deriveKey } from '../../../utils/crypto';
import { getOrFetchAuxKey } from './auxKeyFetcher';
import { decryptProtectedThumbnail } from './thumbnailDecryptor';
import { repairProtectedThumbnail } from './thumbnailRepair';
import { ProtectedImageItem } from './types';
import { getCachedAspectRatio, saveAspectRatio } from '../../../utils/aspectRatioCache';

export async function processSingleProtectedImage(
  img: ProtectedImageItem,
  extraPassword: string,
  user: User | null,
  cache: Map<string, string>
): Promise<ProtectedImageItem> {
  if (cache.has(img.id)) {
    return {
      ...img,
      url: cache.get(img.id)!,
      failed: false,
      noThumbnail: !img.thumbnailCiphertext,
      isVideo: img.contentType?.startsWith('video/')
    };
  }

  const auxKey = await getOrFetchAuxKey(img.id, user);
  if (!auxKey) {
    return {
      ...img,
      url: '',
      failed: true,
      noThumbnail: true,
      isVideo: img.contentType?.startsWith('video/')
    };
  }

  const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0'));
  const combinedKey = await deriveKey(extraPassword, salt);

  let { decryptedUrl, failed } = await decryptProtectedThumbnail(img, combinedKey);
  let finalImg = img;

  if (failed) {
    const rep = await repairProtectedThumbnail(img, combinedKey, user);
    finalImg = rep.finalImg;
    if (!rep.failed && rep.decryptedUrl) {
      decryptedUrl = rep.decryptedUrl;
      failed = false;
    }
  }

  if (decryptedUrl) {
    cache.set(img.id, decryptedUrl);
    if (!getCachedAspectRatio(img.id)) {
      try {
        const im = new Image();
        im.src = decryptedUrl;
        if (!(im.complete && im.naturalWidth && im.naturalHeight)) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 120);
            im.onload = () => { clearTimeout(timer); resolve(); };
            im.onerror = () => { clearTimeout(timer); resolve(); };
          });
        }
        if (im.naturalWidth && im.naturalHeight) {
          saveAspectRatio(img.id, im.naturalWidth / im.naturalHeight);
        }
      } catch {}
    }
  }

  return {
    ...finalImg,
    url: decryptedUrl,
    failed,
    noThumbnail: !finalImg.thumbnailCiphertext,
    isVideo: finalImg.contentType?.startsWith('video/')
  };
}
