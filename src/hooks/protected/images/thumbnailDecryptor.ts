import { decryptData } from '../../../utils/crypto';
import { decryptFileKey, decryptWithFileKey } from '../../../utils/fileCrypto';
import { ProtectedImageItem } from './types';

/**
 * Descriptografa thumbnail com chave combinada ou envelope
 */
export async function decryptProtectedThumbnail(
  img: ProtectedImageItem,
  combinedKey: CryptoKey
): Promise<{ decryptedUrl: string; failed: boolean }> {
  let decryptedUrl = '';
  let failed = false;

  let fileKeyStr: string | null = null;
  if (img.fileKeyCiphertext && img.fileKeyIv && img.fileSalt) {
    try {
      fileKeyStr = await decryptFileKey(
        img.fileKeyCiphertext,
        img.fileKeyIv,
        combinedKey
      );
    } catch (e) {
      console.error('Failed to decrypt file key for thumbnail', e);
    }
  }

  if (img.thumbnailCiphertext && img.thumbnailIv) {
    try {
      if (fileKeyStr && img.fileSalt) {
        try {
          decryptedUrl = await decryptWithFileKey(
            img.thumbnailCiphertext,
            img.thumbnailIv,
            fileKeyStr,
            img.fileSalt
          );
        } catch (innerErr) {
          decryptedUrl = await decryptData(
            img.thumbnailCiphertext,
            img.thumbnailIv,
            combinedKey
          );
        }
      } else {
        decryptedUrl = await decryptData(
          img.thumbnailCiphertext,
          img.thumbnailIv,
          combinedKey
        );
      }
    } catch (thErr) {
      console.warn('Failed decrypting thumbnail', thErr);
      failed = true;
    }
  }

  return { decryptedUrl, failed };
}
