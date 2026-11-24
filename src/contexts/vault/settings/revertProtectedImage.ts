import { User } from 'firebase/auth';
import { deriveKey, decryptData } from '../../../utils/crypto';
import { fetchAndUnpackImage } from '../../../utils/fileCrypto';
import { getImageFromCache, removeImageFromCache, removeAuxKeyFromCache } from '../../../utils/db';
import { getSafeAuthToken } from '../../../utils/safeAuthToken';
import { getMediaKeyApi, deleteMediaKeyApi } from '../../../services/vaultApiService';
import { toCipherString } from './helpers';
import { uploadRevertedImagePayload } from './vaultUploadApi';

export async function revertProtectedImageLogic(
  securityImageId: string,
  user: User,
  cryptoKey: CryptoKey,
  currentExtraPassword: string | null
): Promise<void> {
  try {
    const keyDoc = await getMediaKeyApi(user, securityImageId);
    if (!keyDoc || !currentExtraPassword || !cryptoKey) return;

    const auxKey = keyDoc.auxKey || keyDoc.keyCiphertext;
    const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0'));
    const combinedKey = await deriveKey(currentExtraPassword, salt);

    let fileData = await getImageFromCache(securityImageId);
    if (!fileData?.ciphertext && !fileData?.fileKeyCiphertext) {
      const token = await getSafeAuthToken(user);
      fileData = await fetchAndUnpackImage(securityImageId, token);
    }
    if (!fileData || !fileData.ciphertext) return;

    const cipherText = toCipherString(fileData.ciphertext);
    const originalBase64 = await decryptData(cipherText, fileData.iv, combinedKey);

    const { generateFileKey, encryptWithFileKey, encryptFileKey } = await import('../../../utils/fileCrypto');
    const newFileKey = generateFileKey();
    const fileSalt = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    const encryptedFull = await encryptWithFileKey(originalBase64, newFileKey, fileSalt);
    const encryptedKey = await encryptFileKey(newFileKey, cryptoKey);

    await uploadRevertedImagePayload({
      id: securityImageId, userId: user.uid, ciphertext: encryptedFull.ciphertext, iv: encryptedFull.iv,
      contentType: fileData.contentType, totalSize: fileData.totalSize,
      fileKeyCiphertext: encryptedKey.ciphertext, fileKeyIv: encryptedKey.iv, fileSalt,
      isChunked: fileData.isChunked || false, chunkCount: fileData.chunkCount || 1, isProtected: false
    }, user);

    await deleteMediaKeyApi(user, securityImageId);
    await removeImageFromCache(securityImageId);
    await removeAuxKeyFromCache(securityImageId).catch(() => {});
  } catch (revertErr) {
    console.error('Failed to revert previous protected image:', revertErr);
  }
}
