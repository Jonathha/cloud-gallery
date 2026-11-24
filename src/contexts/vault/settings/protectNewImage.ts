import { User } from 'firebase/auth';
import { deriveKey, encryptData, decryptData } from '../../../utils/crypto';
import { decryptFileKey, decryptWithFileKey, fetchAndUnpackImage } from '../../../utils/fileCrypto';
import { getImageFromCache, removeImageFromCache, saveAuxKeyToCache } from '../../../utils/db';
import { getSafeAuthToken } from '../../../utils/safeAuthToken';
import { saveMediaKeyApi } from '../../../services/vaultApiService';
import { toCipherString, formatEncryptedImagePrefix } from './helpers';
import { uploadProtectedImagePayload } from './vaultUploadApi';

export async function protectNewImageLogic(
  imageId: string,
  user: User,
  cryptoKey: CryptoKey,
  currentExtraPassword: string,
  now: number
): Promise<void> {
  const { generateAuxiliaryKey } = await import('../../../utils/crypto');
  const auxKey = generateAuxiliaryKey();
  const salt = btoa(auxKey.slice(0, 16).padEnd(16, '0'));
  const combinedKey = await deriveKey(currentExtraPassword, salt);

  let fileData = await getImageFromCache(imageId);
  if (!fileData?.ciphertext && !fileData?.fileKeyCiphertext) {
    const token = await getSafeAuthToken(user);
    fileData = await fetchAndUnpackImage(imageId, token);
  }
  if (!fileData) throw new Error('Dados da imagem inválidos ou não encontrados');

  let originalBase64 = '';
  const cipherText = toCipherString(fileData.ciphertext);
  if (fileData.fileKeyCiphertext && fileData.fileKeyIv && fileData.fileSalt) {
    try {
      const fileKeyStr = await decryptFileKey(fileData.fileKeyCiphertext, fileData.fileKeyIv, cryptoKey);
      originalBase64 = await decryptWithFileKey(cipherText, fileData.iv, fileKeyStr, fileData.fileSalt);
    } catch {
      originalBase64 = await decryptData(cipherText, fileData.iv, cryptoKey);
    }
  } else {
    originalBase64 = await decryptData(cipherText, fileData.iv, cryptoKey);
  }

  originalBase64 = formatEncryptedImagePrefix(originalBase64, fileData.contentType || 'image/jpeg');
  let protectedThumbEncrypted = null;
  if (fileData.thumbnailCiphertext) {
    const thumbCipher = toCipherString(fileData.thumbnailCiphertext);
    const thumbBase64 = await decryptData(thumbCipher, fileData.thumbnailIv, cryptoKey).catch(() => null);
    if (thumbBase64) protectedThumbEncrypted = await encryptData(thumbBase64, combinedKey);
  }

  const protectedEncrypted = await encryptData(originalBase64, combinedKey);
  await saveMediaKeyApi(user, { imageId, keyCiphertext: auxKey, auxKey, isProtected: true, createdAt: now });
  await saveAuxKeyToCache(imageId, auxKey).catch(() => {});

  await uploadProtectedImagePayload({
    id: imageId, userId: user.uid, ciphertext: protectedEncrypted.ciphertext, iv: protectedEncrypted.iv,
    contentType: fileData.contentType, totalSize: fileData.totalSize,
    thumbnailCiphertext: protectedThumbEncrypted?.ciphertext || '', thumbnailIv: protectedThumbEncrypted?.iv || '',
    isChunked: fileData.isChunked || false, chunkCount: fileData.chunkCount || 1, isProtected: true
  }, user);
  await removeImageFromCache(imageId);
}
