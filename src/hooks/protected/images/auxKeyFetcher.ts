import { User } from 'firebase/auth';
import { getAuxKeyFromCache, saveAuxKeyToCache } from '../../../utils/db';
import { getApiUrl } from '../../../utils/apiUrl';

/**
 * Busca ou recupera do cache local a auxKey associada à mídia protegida
 */
export async function getOrFetchAuxKey(
  imageId: string,
  user: User | null
): Promise<string | undefined> {
  let auxKey: string | undefined = undefined;

  try {
    auxKey = await getAuxKeyFromCache(imageId);
  } catch (err) {
    console.warn(`Failed to read cached aux key for ${imageId}:`, err);
  }

  if (!auxKey && navigator.onLine) {
    try {
      const token = user ? await user.getIdToken() : undefined;
      const keyRes = await fetch(getApiUrl(`/api/vault/media-key/${imageId}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        if (keyData.success && keyData.key?.keyCiphertext) {
          auxKey = keyData.key.keyCiphertext;
          await saveAuxKeyToCache(imageId, auxKey);
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch aux key from server for ${imageId}:`, err);
    }
  }

  return auxKey;
}
