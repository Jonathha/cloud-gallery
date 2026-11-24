import { decryptFileKey, encryptFileKey } from '../../../utils/fileCrypto';
import { decryptData, encryptData } from '../../../utils/crypto';

export async function reEncryptForProtection(fileData: any, cryptoKey: CryptoKey, combinedKey: CryptoKey) {
  let newCiphertext = fileData.ciphertext, newIv = fileData.iv;
  let newThumbCipher = fileData.thumbnailCiphertext, newThumbIv = fileData.thumbnailIv;
  let newFileKeyCipher = fileData.fileKeyCiphertext, newFileKeyIv = fileData.fileKeyIv;

  if (fileData.fileKeyCiphertext && fileData.fileKeyIv) {
    const fileKeyStr = await decryptFileKey(fileData.fileKeyCiphertext, fileData.fileKeyIv, cryptoKey);
    const encryptedKey = await encryptFileKey(fileKeyStr, combinedKey);
    newFileKeyCipher = encryptedKey.ciphertext;
    newFileKeyIv = encryptedKey.iv;
  } else {
    if (fileData.ciphertext && fileData.ciphertext !== 'chunked_vault_data') {
      const orig = await decryptData(fileData.ciphertext, fileData.iv, cryptoKey);
      const enc = await encryptData(orig, combinedKey);
      newCiphertext = enc.ciphertext; newIv = enc.iv;
    }
    if (fileData.thumbnailCiphertext) {
      const origThumb = await decryptData(fileData.thumbnailCiphertext, fileData.thumbnailIv, cryptoKey);
      const encThumb = await encryptData(origThumb, combinedKey);
      newThumbCipher = encThumb.ciphertext; newThumbIv = encThumb.iv;
    }
  }
  return { newCiphertext, newIv, newThumbCipher, newThumbIv, newFileKeyCipher, newFileKeyIv };
}
