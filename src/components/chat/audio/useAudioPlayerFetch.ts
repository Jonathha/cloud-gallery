import { ChatMessage } from '../types';
import { getApiUrl } from '../../../utils/apiUrl';
import { memoryAudioCache } from './audioConstants';
import { authPrimary } from '../../../firebase';

export async function getOrFetchBlobUrl(
  msg: ChatMessage,
  setIsLoading: (load: boolean) => void
): Promise<string | null> {
  if (!msg.audioUrl) return null;
  const cacheKey = msg.id || msg.audioUrl;

  const existing = memoryAudioCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  try {
    setIsLoading(true);
    const fullUrl = getApiUrl(msg.audioUrl);
    const headers: Record<string, string> = {};
    if (authPrimary.currentUser) {
      try {
        const token = await authPrimary.currentUser.getIdToken();
        if (token) headers.Authorization = 'Bearer ' + token;
      } catch {}
    }
    const res = await fetch(fullUrl, { headers, credentials: 'omit' });
    if (!res.ok) throw new Error('Falha ao carregar áudio');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    memoryAudioCache.set(cacheKey, blobUrl);
    return blobUrl;
  } catch (err) {
    console.error('[ChatAudioPlayer] Erro ao buscar áudio:', err);
    return null;
  } finally {
    setIsLoading(false);
  }
}
