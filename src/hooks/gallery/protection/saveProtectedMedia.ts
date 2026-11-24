import { generateAuxiliaryKey, deriveKey } from '../../../utils/crypto';
import { getImageFromCache, removeImageFromCache, saveAuxKeyToCache } from '../../../utils/db';
import { fetchAndUnpackImage } from '../../../utils/fileCrypto';
import { getApiUrl } from '../../../utils/apiUrl';
import { reEncryptForProtection } from './reEncryptMedia';
import { getSafeAuthToken } from '../../../utils/safeAuthToken';

export async function protectImageItem(img: any, user: any, cryptoKey: CryptoKey, extraPassword: string) {
  const auxKey = generateAuxiliaryKey();
  const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0'));
  const combinedKey = await deriveKey(extraPassword, salt);
  
  await saveAuxKeyToCache(img.id, auxKey);

  const token = await getSafeAuthToken(user);

  try {
    await fetch(getApiUrl('/api/vault/media-key'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        imageId: img.id,
        keyCiphertext: auxKey,
        isProtected: true
      })
    });
  } catch (err) {
    console.warn('[protectImageItem] Failed to sync auxKey to D1:', err);
  }

  let fileData = await getImageFromCache(img.id);
  if (!fileData?.ciphertext && !fileData?.fileKeyCiphertext) {
    fileData = await fetchAndUnpackImage(img.id, token);
  }
  const enc = await reEncryptForProtection(fileData, cryptoKey, combinedKey);
  const payload = {
    id: img.id, userId: user.uid, ciphertext: enc.newCiphertext, iv: enc.newIv,
    contentType: img.contentType, totalSize: img.totalSize, thumbnailCiphertext: enc.newThumbCipher,
    thumbnailIv: enc.newThumbIv, fileKeyCiphertext: enc.newFileKeyCipher, fileKeyIv: enc.newFileKeyIv,
    fileSalt: fileData.fileSalt, isChunked: img.isChunked, chunkCount: img.chunkCount, isProtected: true
  };
  const res = await fetch(getApiUrl('/api/storage/upload'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Falha ao salvar');
  await removeImageFromCache(img.id);
}
