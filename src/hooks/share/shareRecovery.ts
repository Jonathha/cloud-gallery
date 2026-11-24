import { encryptData, decryptData } from '../../utils/crypto';
import { authPrimary } from '../../firebase';
import { fetchVaultConfigApi, updateVaultSettingsApi } from '../../services/vaultApiService';

export async function saveEncryptedShareRecovery(
  userId: string,
  cryptoKey: CryptoKey | null,
  shareId: string,
  shareKeyBase64: string,
  finalUrl: string
): Promise<boolean> {
  if (!userId || !cryptoKey || !shareId) return false;
  const user = authPrimary.currentUser;
  if (!user) return false;

  try {
    const payloadStr = JSON.stringify({
      v: 1,
      shareId,
      shareKey: shareKeyBase64,
      finalUrl,
      createdAt: Date.now()
    });
    const { ciphertext, iv } = await encryptData(payloadStr, cryptoKey);
    const config = await fetchVaultConfigApi(user);
    const existingRecovery = config?.encryptedShareRecovery
      ? (typeof config.encryptedShareRecovery === 'object' ? config.encryptedShareRecovery : JSON.parse(config.encryptedShareRecovery || '{}'))
      : {};

    existingRecovery[shareId] = {
      ciphertext,
      iv,
      v: 1,
      updatedAt: Date.now()
    };

    await updateVaultSettingsApi(user, { encryptedShareRecovery: existingRecovery });
    return true;
  } catch (err) {
    console.error('Failed to save encrypted share recovery:', err);
    return false;
  }
}

export async function getEncryptedShareRecoveryMap(
  userId: string,
  cryptoKey: CryptoKey | null
): Promise<Record<string, string>> {
  if (!userId || !cryptoKey) return {};
  const user = authPrimary.currentUser;
  if (!user) return {};

  const recoveredMap: Record<string, string> = {};
  try {
    const config = await fetchVaultConfigApi(user);
    if (!config || !config.encryptedShareRecovery) return {};

    const encryptedRecovery = typeof config.encryptedShareRecovery === 'object'
      ? config.encryptedShareRecovery
      : JSON.parse(config.encryptedShareRecovery || '{}');

    if (!encryptedRecovery || typeof encryptedRecovery !== 'object') return {};

    for (const [sId, record] of Object.entries(encryptedRecovery) as [string, any][]) {
      if (!record || !record.ciphertext || !record.iv) continue;
      try {
        const decryptedStr = await decryptData(record.ciphertext, record.iv, cryptoKey);
        const data = JSON.parse(decryptedStr);
        if (data && data.finalUrl) {
          let sanitizedUrl = data.finalUrl;
          if (sanitizedUrl.includes('&key=')) {
            try {
              const parsedUrl = new URL(sanitizedUrl);
              const shareIdParam = parsedUrl.searchParams.get('share') || sId;
              const hashKey = parsedUrl.hash ? parsedUrl.hash.substring(1) : parsedUrl.searchParams.get('key') || '';
              sanitizedUrl = `${parsedUrl.origin}/?share=${shareIdParam}#${encodeURIComponent(decodeURIComponent(hashKey))}`;
            } catch (e) {
              sanitizedUrl = sanitizedUrl.replace(/&key=[^#]+/, '');
            }
          }
          recoveredMap[sId] = sanitizedUrl;
        } else if (data && data.shareKey) {
          const origin = window.location.origin;
          recoveredMap[sId] = `${origin}/?share=${sId}#${encodeURIComponent(data.shareKey)}`;
        }
      } catch (decErr) {
        console.warn(`Failed to decrypt share recovery record for share ${sId}:`, decErr);
      }
    }
  } catch (err) {
    console.error('Failed to load encrypted share recovery map:', err);
  }
  return recoveredMap;
}

export async function removeEncryptedShareRecovery(userId: string, shareId: string) {
  if (!userId || !shareId) return;
  const user = authPrimary.currentUser;
  if (!user) return;

  try {
    const config = await fetchVaultConfigApi(user);
    if (config && config.encryptedShareRecovery) {
      const existingRecovery = typeof config.encryptedShareRecovery === 'object'
        ? config.encryptedShareRecovery
        : JSON.parse(config.encryptedShareRecovery || '{}');

      if (existingRecovery[shareId]) {
        delete existingRecovery[shareId];
        await updateVaultSettingsApi(user, { encryptedShareRecovery: existingRecovery });
      }
    }
  } catch (err) {
    console.error('Failed to remove encrypted share recovery:', err);
  }
}
