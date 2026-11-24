export async function fetchRemoteThumbnailCipher(imgId: string): Promise<{ ciphertext: string; iv: string; fileSalt: string } | null> {
  try {
    const { fetchAndUnpackThumbnail } = await import('../../../utils/fileCrypto');
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const token = auth.currentUser ? await auth.currentUser.getIdToken(false) : undefined;
    const thumbData = await fetchAndUnpackThumbnail(imgId, token);
    if (thumbData && thumbData.ciphertext) {
      try {
        const { getImageFromCache, saveImageToCache } = await import('../../../utils/db');
        const cached = await getImageFromCache(imgId);
        if (cached) {
          await saveImageToCache({
            ...cached,
            thumbnailCiphertext: thumbData.ciphertext,
            thumbnailIv: thumbData.iv || cached.thumbnailIv,
            fileSalt: thumbData.fileSalt || cached.fileSalt
          });
        }
      } catch (dbErr) { console.warn("Failed to persist thumbnail to cache:", dbErr); }
      return { ciphertext: thumbData.ciphertext, iv: thumbData.iv || '', fileSalt: thumbData.fileSalt || '' };
    }
  } catch (fetchErr) { console.warn("Failed fetching thumbnail for", imgId, fetchErr); }
  return null;
}
