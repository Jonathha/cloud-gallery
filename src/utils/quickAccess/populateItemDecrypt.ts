import { decryptData } from '../crypto';
import { decryptWithFileKey, decryptFileKey } from '../fileCrypto';
import { enforceDataPrefix } from '../../hooks/gallery/decrypt/sessionCache';

/**
 * Utilitário de tentativa de descriptografia individual de item para cache rápido
 */
export async function resolveItemDataUrl(
  item: any,
  cryptoKey: CryptoKey
): Promise<string | null> {
  let fileKeyStr: string | null = null;
  if (item.fileKeyCiphertext && item.fileKeyIv && item.fileSalt && cryptoKey) {
    try {
      fileKeyStr = await decryptFileKey(item.fileKeyCiphertext, item.fileKeyIv, cryptoKey);
    } catch {}
  }

  const cipher = item.thumbnailCiphertext || '';
  const iv = item.thumbnailIv || '';
  const salt = item.fileSalt || '';
  let dataUrl: string | null = null;

  if (cipher && iv) {
    if (fileKeyStr && salt) {
      try {
        dataUrl = await decryptWithFileKey(cipher, iv, fileKeyStr, salt);
      } catch {}
    }
    if (!dataUrl) {
      try {
        dataUrl = await decryptData(cipher, iv, cryptoKey);
      } catch {}
    }
  }

  if (!dataUrl && item.ciphertext && item.iv && item.ciphertext !== 'chunked_vault_data') {
    if (fileKeyStr && salt) {
      try {
        dataUrl = await decryptWithFileKey(item.ciphertext, item.iv, fileKeyStr, salt);
      } catch {}
    }
    if (!dataUrl) {
      try {
        dataUrl = await decryptData(item.ciphertext, item.iv, cryptoKey);
      } catch {}
    }
  }

  return dataUrl ? enforceDataPrefix(dataUrl, item.contentType || 'image/jpeg') : null;
}
