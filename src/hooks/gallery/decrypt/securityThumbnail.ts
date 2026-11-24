import { deriveKey } from '../../../utils/crypto';
import { decryptFileKey } from '../../../utils/fileCrypto';
import { enforceDataPrefix, sessionDecryptedCache } from './sessionCache';
import { fetchSecurityAuxKey } from './securityAuxKey';
import { decryptSecurityBuffer } from './securityDecryptBuffer';
import { saveAspectRatio } from '../../../utils/aspectRatioCache';

export async function decryptSecurityImageThumbnail(
  img: any, extraPassword: string | null | undefined, decryptedCache: Map<string, string>
): Promise<{ url: string; failed: boolean; noThumbnail: boolean }> {
  try {
    const auxKey = await fetchSecurityAuxKey(img.id);
    if (!auxKey || !extraPassword) return { url: '', failed: true, noThumbnail: false };
    const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0'));
    const combinedKey = await deriveKey(extraPassword, salt);
    let fileKeyStr: string | null = null;
    if (img.fileKeyCiphertext && img.fileKeyIv && img.fileSalt) {
      try { fileKeyStr = await decryptFileKey(img.fileKeyCiphertext, img.fileKeyIv, combinedKey); } catch {}
    }
    const cipher = img.thumbnailCiphertext || img.ciphertext;
    const iv = img.thumbnailIv || img.iv;
    if (!img.thumbnailCiphertext && img.ciphertext === 'chunked_vault_data') {
      return { url: '', failed: false, noThumbnail: true };
    }
    if (!cipher || !iv) return { url: '', failed: true, noThumbnail: false };
    let decrypted = await decryptSecurityBuffer(cipher, iv, fileKeyStr, img.fileSalt, combinedKey);
    if (decrypted) {
      decrypted = enforceDataPrefix(decrypted, img.contentType || "image/jpeg");
      sessionDecryptedCache.set(img.id, decrypted);
      if (decryptedCache) decryptedCache.set(img.id, decrypted);

      try {
        const im = new Image();
        im.src = decrypted;
        if (!(im.complete && im.naturalWidth && im.naturalHeight)) {
          await new Promise<void>((resolve) => {
            im.onload = () => resolve();
            im.onerror = () => resolve();
          });
        }
        if (im.naturalWidth && im.naturalHeight) {
          const ratio = im.naturalWidth / im.naturalHeight;
          saveAspectRatio(img.id, ratio);
        }
      } catch (e) {}

      return { url: decrypted, failed: false, noThumbnail: false };
    }
    return { url: '', failed: true, noThumbnail: false };
  } catch { return { url: '', failed: true, noThumbnail: false }; }
}
