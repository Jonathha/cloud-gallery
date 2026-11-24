import { decryptData } from '../../../utils/crypto';
import { decryptWithFileKey, decryptFileKey } from '../../../utils/fileCrypto';
import { enforceDataPrefix, sessionDecryptedCache } from './sessionCache';
import { fetchRemoteThumbnailCipher } from './remoteThumbnailFetch';
import { saveAspectRatio, getCachedAspectRatio } from '../../../utils/aspectRatioCache';
import { saveThumbnailToQuickAccessCache } from '../../../utils/quickAccessCache';
import { getActiveQuickAccessUid } from '../../../utils/quickAccess';
import { getSafeAuthToken } from '../../../utils/safeAuthToken';
import { authPrimary } from '../../../firebase';
import { fetchThumbnailWithRetry, registerFailedThumbnail } from './thumbnailRetry';

export async function decryptStandardThumbnail(
  img: any, cryptoKey: CryptoKey | null | undefined, decryptedCache: Map<string, string>
): Promise<{ url: string; failed: boolean; noThumbnail: boolean; isMissing?: boolean }> {
  let fileKeyStr: string | null = null;
  if (img.fileKeyCiphertext && img.fileKeyIv && img.fileSalt && cryptoKey) {
    try { fileKeyStr = await decryptFileKey(img.fileKeyCiphertext, img.fileKeyIv, cryptoKey); } catch {}
  }
  let cipher = img.thumbnailCiphertext || "";
  let iv = img.thumbnailIv || "";
  let salt = img.fileSalt || "";
  let isRemote404 = false;
  let thumbFetchErr: any = null;

  if (!cipher && img.id) {
    try {
      const { fetchAndUnpackThumbnail } = await import('../../../utils/fileCrypto');
      const thumbData = await fetchThumbnailWithRetry(async (fresh) => {
        let token = '';
        if (fresh) { try { token = (await authPrimary.currentUser?.getIdToken(true)) || ''; } catch {} }
        if (!token) token = await getSafeAuthToken();
        return fetchAndUnpackThumbnail(img.id, token);
      });
      if (thumbData && thumbData.ciphertext) {
        if (thumbData.fileKeyCiphertext && thumbData.fileKeyIv && (thumbData.fileSalt || salt) && cryptoKey) {
          try {
            fileKeyStr = await decryptFileKey(
              thumbData.fileKeyCiphertext,
              thumbData.fileKeyIv,
              cryptoKey
            );
          } catch (fkErr) {
            console.warn("Failed re-deriving fileKey from thumbData header:", fkErr);
          }
        }
        try {
          const { getImageFromCache, saveImageToCache } = await import('../../../utils/db');
          const cached = await getImageFromCache(img.id);
          if (cached) {
            await saveImageToCache({
              ...cached,
              thumbnailCiphertext: thumbData.ciphertext,
              thumbnailIv: thumbData.thumbnailIv || thumbData.iv || cached.thumbnailIv,
              fileSalt: thumbData.fileSalt || cached.fileSalt,
              fileKeyCiphertext: thumbData.fileKeyCiphertext || cached.fileKeyCiphertext,
              fileKeyIv: thumbData.fileKeyIv || cached.fileKeyIv,
              iv: cached.iv || thumbData.iv
            });
          }
        } catch (dbErr) { console.warn("Failed to persist thumbnail to cache:", dbErr); }
        cipher = thumbData.ciphertext;
        iv = thumbData.iv || thumbData.thumbnailIv || iv;
        salt = thumbData.fileSalt || salt;
      }
    } catch (fetchErr: any) {
      thumbFetchErr = fetchErr;
      if (fetchErr && typeof fetchErr.message === 'string' && (fetchErr.message.includes('404') || fetchErr.message.includes('não encontrada'))) {
        isRemote404 = true;
      }
      console.warn("Failed fetching thumbnail for", img.id, fetchErr);
    }
  }
  const tryDecrypt = async (c: string, v: string, s: string) => {
    if (fileKeyStr && s) {
      try { return await decryptWithFileKey(c, v, fileKeyStr, s); } catch {}
    }
    return await decryptData(c, v, cryptoKey!);
  };
  let url = '';
  if (cipher && iv) { try { url = await tryDecrypt(cipher, iv, salt); } catch {} }
  if (!url && img.ciphertext && img.iv && img.ciphertext !== 'chunked_vault_data') {
    try { url = await tryDecrypt(img.ciphertext, img.iv, salt); } catch {}
  }

  // Automatic targeted repair of stale D1 metadata on decryption failure
  if (!url && img.id && !isRemote404 && !sessionStorage.getItem(`repaired_img_${img.id}`)) {
    sessionStorage.setItem(`repaired_img_${img.id}`, 'true');
    try {
      const token = await getSafeAuthToken();
      const userId = img.userId;
      if (token && userId) {
        const { getApiUrl } = await import('../../../utils/apiUrl');
        const repRes = await fetch(getApiUrl(`/api/storage/images?userId=${userId}&repairId=${img.id}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (repRes.ok) {
          const resData = await repRes.json().catch(() => null);
          if (resData && resData.success && Array.isArray(resData.images)) {
            const repairedItem = resData.images.find((x: any) => x.id === img.id);
            if (repairedItem) {
              // Save to local cache so IndexedDB is also updated
              try {
                const { saveImageToCache, getImageFromCache } = await import('../../../utils/db');
                const cached = await getImageFromCache(img.id);
                if (cached) {
                  await saveImageToCache({
                    ...cached,
                    iv: repairedItem.iv,
                    thumbnailIv: repairedItem.thumbnailIv,
                    fileKeyCiphertext: repairedItem.fileKeyCiphertext,
                    fileKeyIv: repairedItem.fileKeyIv,
                    fileSalt: repairedItem.fileSalt,
                    totalSize: repairedItem.totalSize,
                  });
                }
              } catch (dbErr) {
                console.warn("Failed saving repaired metadata to local cache:", dbErr);
              }
              // Attempt decrypt again with the repaired item
              return await decryptStandardThumbnail(repairedItem, cryptoKey, decryptedCache);
            }
          }
        }
      }
    } catch (repErr) {
      console.warn("Failed automatic repair for standard image:", img.id, repErr);
    }
  }

  if (url) {
    url = enforceDataPrefix(url, img.contentType || "image/jpeg");
    sessionDecryptedCache.set(img.id, url);
    if (decryptedCache) decryptedCache.set(img.id, url);

    // Ensure aspect ratio is cached before mounting GalleryItem to prevent 1:1 layout shifts
    let ratio = getCachedAspectRatio(img.id);
    if (!ratio) {
      try {
        const im = new Image();
        im.src = url;
        if (!(im.complete && im.naturalWidth && im.naturalHeight)) {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 120);
            im.onload = () => { clearTimeout(timer); resolve(); };
            im.onerror = () => { clearTimeout(timer); resolve(); };
          });
        }
        if (im.naturalWidth && im.naturalHeight) {
          ratio = im.naturalWidth / im.naturalHeight;
          saveAspectRatio(img.id, ratio);
        }
      } catch {}
    }

    if (cryptoKey) {
      const targetUid = img.userId || getActiveQuickAccessUid();
      saveThumbnailToQuickAccessCache(targetUid, img.id, url, cryptoKey, ratio).catch(() => {});
    }

    return { url, failed: false, noThumbnail: false, isMissing: false };
  }
  if (thumbFetchErr && img.id) registerFailedThumbnail(img.id, thumbFetchErr.status, thumbFetchErr.retryAfter);
  const isFail = !img.isChunked && img.ciphertext !== 'chunked_vault_data';
  return {
    url: '',
    failed: isFail && !isRemote404,
    noThumbnail: img.isChunked || img.ciphertext === 'chunked_vault_data',
    isMissing: isRemote404
  };
}
