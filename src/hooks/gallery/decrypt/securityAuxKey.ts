import { getApiUrl } from '../../../utils/apiUrl';
import { authPrimary } from '../../../firebase';
import { getSafeAuthToken } from '../../../utils/safeAuthToken';

export async function fetchSecurityAuxKey(imgId: string): Promise<string | null> {
  const { getAuxKeyFromCache, saveAuxKeyToCache } = await import('../../../utils/db');
  let auxKey = await getAuxKeyFromCache(imgId);
  if (!auxKey && navigator.onLine) {
    try {
      const user = authPrimary.currentUser;
      const token = await getSafeAuthToken(user);
      const res = await fetch(getApiUrl(`/api/vault/media-key/${imgId}`), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.key?.keyCiphertext) {
          auxKey = data.key.keyCiphertext;
          await saveAuxKeyToCache(imgId, auxKey);
        }
      }
    } catch (err) {
      console.warn('[fetchSecurityAuxKey] D1 fetch failed:', err);
    }
  }
  return auxKey || null;
}
