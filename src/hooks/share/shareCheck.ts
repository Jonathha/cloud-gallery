import { getRealFirebaseUser } from './shareUtils';
import { getLocalShareUrls, setLocalShareUrl } from './shareStorage';
import { getEncryptedShareRecoveryMap } from './shareRecovery';
import { fetchImageShares } from './shareApi';

interface CheckExistingShareParams {
  user: any;
  cryptoKey: CryptoKey | null;
  imageId: string;
  setChecking: (val: boolean) => void;
  setError: (val: string) => void;
  setExistingShares: (val: any[]) => void;
  setExistingShare: (val: any) => void;
  setGeneratedLink: (val: string) => void;
  setShowCreateForm: (val: boolean) => void;
}

export async function checkExistingShareLogic(params: CheckExistingShareParams) {
  const {
    user,
    cryptoKey,
    imageId,
    setChecking,
    setError,
    setExistingShares,
    setExistingShare,
    setGeneratedLink,
    setShowCreateForm
  } = params;

  const activeUser = getRealFirebaseUser(user);
  if (!activeUser) {
    setChecking(false);
    return;
  }

  setChecking(true);
  setError('');
  try {
    const token = await activeUser.getIdToken();
    if (!token) throw new Error("Token de autenticação não encontrado.");

    const res = await fetchImageShares(imageId, token);
    if (res.ok) {
      const resData = await res.json();
      const origin = window.location.origin;
      const localUrls = getLocalShareUrls(activeUser.uid);
      const cloudUrls = await getEncryptedShareRecoveryMap(activeUser.uid, cryptoKey);
      const rawList = resData.shares || (resData.share ? [resData.share] : []);
      const sharesList = rawList.map((s: any) => {
        const restoredUrl = localUrls[s.id] || cloudUrls[s.id] || s.finalUrl;
        if (restoredUrl) {
          setLocalShareUrl(activeUser.uid, s.id, restoredUrl);
        }
        return {
          ...s,
          finalUrl: restoredUrl || `${origin}/?share=${s.id}`
        };
      });

      setExistingShares(sharesList);
      if (sharesList.length > 0) {
        setExistingShare(sharesList[0]);
        setGeneratedLink(sharesList[0].finalUrl);
        setShowCreateForm(false);
      } else {
        setExistingShare(null);
        setGeneratedLink('');
        setShowCreateForm(true);
      }
    } else {
      setExistingShares([]);
      setExistingShare(null);
      setGeneratedLink('');
      setShowCreateForm(true);
    }
  } catch (err: any) {
    console.error('Erro ao verificar compartilhamento seguro:', err);
    setExistingShares([]);
    setExistingShare(null);
    setShowCreateForm(true);
  } finally {
    setChecking(false);
  }
}
