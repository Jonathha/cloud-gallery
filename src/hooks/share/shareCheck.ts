import { getRealFirebaseUser } from './shareUtils';
import { getLocalShareUrls, setLocalShareUrl } from './shareStorage';
import { getEncryptedShareRecoveryMap } from './shareRecovery';
import { fetchImageShares } from './shareApi';

// Last known links per user+media, so reopening the modal shows them instantly while the server confirms.
const shareListCache = new Map<string, any[]>();
const cacheKey = (uid: string, imageId: string) => `${uid}:${imageId}`;
export const getCachedShares = (uid: string, imageId: string) => shareListCache.get(cacheKey(uid, imageId));
export const setCachedShares = (uid: string, imageId: string, shares: any[]) => { shareListCache.set(cacheKey(uid, imageId), shares); };

interface CheckExistingShareParams {
  user: any; cryptoKey: CryptoKey | null; imageId: string;
  setChecking: (val: boolean) => void; setCheckFailed: (val: boolean) => void;
  setError: (val: string) => void; setExistingShares: (val: any[]) => void;
  setExistingShare: (val: any) => void; setGeneratedLink: (val: string) => void;
  setShowCreateForm: (val: boolean) => void;
  setRefreshing?: (val: boolean) => void;
}

export async function checkExistingShareLogic(params: CheckExistingShareParams) {
  const { user, cryptoKey, imageId, setChecking, setCheckFailed, setError,
    setExistingShares, setExistingShare, setGeneratedLink, setShowCreateForm, setRefreshing } = params;
  const activeUser = getRealFirebaseUser(user);

  if (!activeUser) {
    setChecking(false);
    setCheckFailed(true);
    setError('Não foi possível confirmar sua sessão. Entre novamente e tente de novo.');
    setShowCreateForm(false);
    return;
  }

  setCheckFailed(false);
  setError('');
  const cached = getCachedShares(activeUser.uid, imageId);
  if (cached) {
    // Show what we already know right away; the server response below replaces it.
    setExistingShares(cached);
    setExistingShare(cached[0] || null);
    setGeneratedLink(cached[0]?.finalUrl || '');
    setShowCreateForm(cached.length === 0);
    setChecking(false);
    setRefreshing?.(true);
  } else {
    setChecking(true);
  }
  try {
    const token = await activeUser.getIdToken();
    if (!token) throw new Error('Token de autenticação não encontrado.');
    const res = await fetchImageShares(imageId, token);
    if (!res.ok) throw new Error('Não foi possível verificar os compartilhamentos. Tente novamente.');

    const resData = await res.json();
    if (resData?.success === false) throw new Error(resData.error || 'Falha ao verificar compartilhamentos.');
    const origin = window.location.origin;
    const localUrls = getLocalShareUrls(activeUser.uid);
    const rawList = resData.shares || (resData.share ? [resData.share] : []);
    let cloudUrls: Record<string, string> = {};
    if (rawList.length && rawList.some((s: any) => !localUrls[s.id] && !s.finalUrl)) {
      cloudUrls = await getEncryptedShareRecoveryMap(activeUser.uid, cryptoKey);
    }
    const sharesList = rawList.map((share: any) => {
      const restoredUrl = localUrls[share.id] || cloudUrls[share.id] || share.finalUrl;
      if (restoredUrl) setLocalShareUrl(activeUser.uid, share.id, restoredUrl);
      return { ...share, finalUrl: restoredUrl || `${origin}/?share=${share.id}` };
    });

    setCachedShares(activeUser.uid, imageId, sharesList);
    setExistingShares(sharesList);
    setExistingShare(sharesList[0] || null);
    setGeneratedLink(sharesList[0]?.finalUrl || '');
    setShowCreateForm(sharesList.length === 0);
  } catch (err: any) {
    console.error('Erro ao verificar compartilhamento seguro:', err);
    setCheckFailed(true);
    setError(err.message || 'Não foi possível verificar os compartilhamentos. Tente novamente.');
    setShowCreateForm(false);
  } finally {
    setChecking(false);
    setRefreshing?.(false);
  }
}
