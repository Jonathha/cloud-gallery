import { decryptData } from '../../../utils/crypto';
import { decryptWithFileKey } from '../../../utils/fileCrypto';

export async function decryptChunkedTrashItem(
  item: any, activeKey: CryptoKey, fileKeyStr: string | null
): Promise<{ decryptedUrl: string; noThumbnail: boolean }> {
  let decryptedUrl = '';
  let noThumbnail = true;
  if (item.thumbnailCiphertext && item.thumbnailIv) {
    try {
      if (fileKeyStr && item.fileSalt) {
        decryptedUrl = await decryptWithFileKey(item.thumbnailCiphertext, item.thumbnailIv, fileKeyStr, item.fileSalt);
      } else {
        decryptedUrl = await decryptData(item.thumbnailCiphertext, item.thumbnailIv, activeKey);
      }
      noThumbnail = false;
    } catch (e) {
      console.warn('Could not decrypt trash thumbnail', e);
    }
  }
  return { decryptedUrl, noThumbnail };
}
