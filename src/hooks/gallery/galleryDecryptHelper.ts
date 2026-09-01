import { DecryptedImage } from '../../types';
import { getTimestamp } from '../../utils/galleryHelpers';
import { decryptData } from '../../utils/crypto';
import { decryptFileKey, decryptWithFileKey } from '../../utils/fileCrypto';

export const sessionDecryptedCache = new Map<string, string>();

export function clearSessionDecryptedCache() {
  sessionDecryptedCache.clear();
}

export function getSessionDecryptedCache() {
  return sessionDecryptedCache;
}

const enforceDataPrefix = (url: string, cType: string) => {
  if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
    return `data:${cType || 'image/jpeg'};base64,${url}`;
  }
  return url;
};

export async function decryptSingleThumbnail(
  img: any,
  securityImageId: string | null | undefined,
  isExtraUnlocked: boolean | undefined,
  extraPassword: string | null | undefined,
  cryptoKey: CryptoKey | null | undefined,
  decryptedCache: Map<string, string>
): Promise<DecryptedImage> {
  const createdAt = getTimestamp(img.createdAt);
  const isVideo = img.contentType?.startsWith('video/') || false;
  const isChunked = img.isChunked || false;
  const chunkCount = img.chunkCount || 1;
  const contentType = img.contentType || (isVideo ? 'video/mp4' : 'image/png');
  const totalSize = img.totalSize || 0;

  // Special handling for the security image (fake vault trigger)
  if (img.id === securityImageId && !isExtraUnlocked) {
    return {
      id: img.id,
      url: '',
      createdAt,
      isVideo,
      isChunked,
      chunkCount,
      contentType,
      totalSize,
      failed: false,
      noThumbnail: false
    } as DecryptedImage;
  }

  if (img.id === securityImageId && isExtraUnlocked) {
    let decryptedThumbnailUrl = '';
    let failed = false;
    let noThumbnail = false;

    try {
      const { getAuxKeyFromCache, saveAuxKeyToCache } = await import('../../utils/db');
      let auxKey = await getAuxKeyFromCache(img.id);
      if (!auxKey) {
        const { doc, getDoc } = await import('firebase/firestore');
        const { dbPrimary } = await import('../../firebase');
        const docSnap = await getDoc(doc(dbPrimary, 'media_keys', img.id));
        if (docSnap.exists()) {
          auxKey = docSnap.data().auxKey;
          if (auxKey) {
            await saveAuxKeyToCache(img.id, auxKey);
          }
        }
      }

      if (auxKey && extraPassword) {
        const { deriveKey } = await import('../../utils/crypto');
        const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0'));
        const combinedKey = await deriveKey(extraPassword, salt);

        let fileKeyStr: string | null = null;
        try {
          if ((img as any).fileKeyCiphertext && (img as any).fileKeyIv && (img as any).fileSalt) {
            fileKeyStr = await decryptFileKey((img as any).fileKeyCiphertext, (img as any).fileKeyIv, combinedKey);
          }
        } catch (e) {
          console.error('Failed to decrypt file key for security image', e);
        }

        if (img.thumbnailCiphertext && img.thumbnailIv) {
          if (fileKeyStr && (img as any).fileSalt) {
            try {
              decryptedThumbnailUrl = await decryptWithFileKey(img.thumbnailCiphertext, img.thumbnailIv, fileKeyStr, (img as any).fileSalt);
            } catch (innerErr) {
              decryptedThumbnailUrl = await decryptData(img.thumbnailCiphertext, img.thumbnailIv, combinedKey);
            }
          } else {
            decryptedThumbnailUrl = await decryptData(img.thumbnailCiphertext, img.thumbnailIv, combinedKey);
          }
        } else if (img.ciphertext && img.iv) {
          if (img.ciphertext === 'chunked_vault_data') {
            noThumbnail = true;
          } else {
            if (fileKeyStr && (img as any).fileSalt) {
              try {
                decryptedThumbnailUrl = await decryptWithFileKey(img.ciphertext, img.iv, fileKeyStr, (img as any).fileSalt);
              } catch (innerErr) {
                decryptedThumbnailUrl = await decryptData(img.ciphertext, img.iv, combinedKey);
              }
            } else {
              decryptedThumbnailUrl = await decryptData(img.ciphertext, img.iv, combinedKey);
            }
          }
        } else {
          failed = true;
        }

        if (decryptedThumbnailUrl) {
          decryptedThumbnailUrl = enforceDataPrefix(decryptedThumbnailUrl, img.contentType || "image/jpeg");
          sessionDecryptedCache.set(img.id, decryptedThumbnailUrl);
          if (decryptedCache) decryptedCache.set(img.id, decryptedThumbnailUrl);
        }
      } else {
        failed = true;
      }
    } catch (err) {
      console.error('Error decrypting security image thumbnail:', img.id, err);
      failed = true;
    }

    return {
      id: img.id,
      url: decryptedThumbnailUrl,
      createdAt,
      isVideo,
      isChunked,
      chunkCount,
      contentType,
      totalSize,
      failed,
      noThumbnail
    } as DecryptedImage;
  }

  if (sessionDecryptedCache.has(img.id) || (decryptedCache && decryptedCache.has(img.id))) {
    const cachedUrl = sessionDecryptedCache.get(img.id) || (decryptedCache && decryptedCache.get(img.id))!;
    return {
      id: img.id,
      url: cachedUrl,
      createdAt,
      isVideo,
      isChunked,
      chunkCount,
      contentType,
      totalSize
    } as DecryptedImage;
  }

  let decryptedThumbnailUrl = '';
  let failed = false;
  let noThumbnail = false;

  let fileKeyStr: string | null = null;
  try {
    if ((img as any).fileKeyCiphertext && (img as any).fileKeyIv && (img as any).fileSalt) {
      fileKeyStr = await decryptFileKey((img as any).fileKeyCiphertext, (img as any).fileKeyIv, cryptoKey!);
    }
  } catch (e) {
    console.error('Failed to decrypt file key', e);
  }

  let decryptedSuccess = false;

  let currentThumbCiphertext = img.thumbnailCiphertext || "";
  let currentThumbIv = img.thumbnailIv || "";
  let currentFileSalt = (img as any).fileSalt || "";

  if (!currentThumbCiphertext && img.id) {
    try {
      const { fetchAndUnpackThumbnail } = await import('../../utils/fileCrypto');
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken(false) : undefined;
      
      const thumbData = await fetchAndUnpackThumbnail(img.id, token);
      if (thumbData && thumbData.ciphertext) {
        currentThumbCiphertext = thumbData.ciphertext;
        currentThumbIv = thumbData.iv || currentThumbIv;
        currentFileSalt = thumbData.fileSalt || currentFileSalt;

        // Also update local IndexedDB cache so we don't have to fetch it on next app load!
        try {
          const { getImageFromCache, saveImageToCache } = await import('../../utils/db');
          const cached = await getImageFromCache(img.id);
          if (cached) {
            await saveImageToCache({
              ...cached,
              thumbnailCiphertext: currentThumbCiphertext,
              thumbnailIv: currentThumbIv,
              fileSalt: currentFileSalt || cached.fileSalt
            });
          }
        } catch (dbErr) {
          console.warn("Failed to persist fetched thumbnail to local cache:", dbErr);
        }
      }
    } catch (fetchErr) {
      console.warn("Failed fetching thumbnail for", img.id, fetchErr);
    }
  }

  if (currentThumbCiphertext && currentThumbIv) {
    try {
      if (fileKeyStr && currentFileSalt) {
        try {
          decryptedThumbnailUrl = await decryptWithFileKey(currentThumbCiphertext, currentThumbIv, fileKeyStr, currentFileSalt);
        } catch (innerErr) {
          console.warn('Envelope decryption failed for thumbnail, trying legacy cryptoKey decryption as fallback...', innerErr);
          decryptedThumbnailUrl = await decryptData(currentThumbCiphertext, currentThumbIv, cryptoKey!);
        }
      } else {
        decryptedThumbnailUrl = await decryptData(currentThumbCiphertext, currentThumbIv, cryptoKey!);
      }
      if (decryptedThumbnailUrl) {
        decryptedThumbnailUrl = enforceDataPrefix(decryptedThumbnailUrl, img.contentType || "image/jpeg");
        sessionDecryptedCache.set(img.id, decryptedThumbnailUrl);
        if (decryptedCache) decryptedCache.set(img.id, decryptedThumbnailUrl);
        decryptedSuccess = true;
      }
    } catch (thErr) {
      console.warn('Error decrypting thumbnail for', img.id, thErr);
    }
  }

  if (!decryptedSuccess && img.ciphertext && img.iv && img.ciphertext !== 'chunked_vault_data') {
    try {
      if (fileKeyStr && (img as any).fileSalt) {
        try {
          decryptedThumbnailUrl = await decryptWithFileKey(img.ciphertext, img.iv, fileKeyStr, (img as any).fileSalt);
        } catch (innerErr) {
          console.warn('Envelope decryption failed for full content as thumbnail, trying legacy cryptoKey decryption as fallback...', innerErr);
          decryptedThumbnailUrl = await decryptData(img.ciphertext, img.iv, cryptoKey!);
        }
      } else {
        decryptedThumbnailUrl = await decryptData(img.ciphertext, img.iv, cryptoKey!);
      }
      if (decryptedThumbnailUrl) {
        decryptedThumbnailUrl = enforceDataPrefix(decryptedThumbnailUrl, img.contentType || "image/jpeg");
        sessionDecryptedCache.set(img.id, decryptedThumbnailUrl);
        if (decryptedCache) decryptedCache.set(img.id, decryptedThumbnailUrl);
        decryptedSuccess = true;
      }
    } catch (fullErr) {
      console.error('Error decrypting full content fallback for thumbnail', img.id, fullErr);
    }
  }

  if (!decryptedSuccess) {
    if (isChunked || img.ciphertext === 'chunked_vault_data') {
      noThumbnail = true;
    } else {
      failed = true;
    }
  }

  return {
    id: img.id,
    url: decryptedThumbnailUrl,
    createdAt,
    isVideo,
    isChunked,
    chunkCount,
    contentType,
    totalSize,
    failed,
    noThumbnail
  } as DecryptedImage;
}
