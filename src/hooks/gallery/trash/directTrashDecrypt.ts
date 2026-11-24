import { bytesToBase64, decryptData, decryptDataRaw } from '../../../utils/crypto';
import { decryptWithFileKey, decryptWithFileKeyRaw, decryptedBufferToBlobUrlAsync } from '../../../utils/fileCrypto';

async function toBase64Str(input: any): Promise<string> {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (input instanceof Uint8Array) return await bytesToBase64(input);
  if (input instanceof ArrayBuffer) return await bytesToBase64(new Uint8Array(input));
  return '';
}

async function tryDecryptPayload(
  cipherInput: any,
  iv: string,
  contentType: string,
  activeKey: CryptoKey,
  fileKeyStr: string | null,
  fileSalt?: string
): Promise<string> {
  const cipherB64 = await toBase64Str(cipherInput);
  if (!cipherB64 || !iv) throw new Error('Missing cipher or iv');

  try {
    const rawBuf = (fileKeyStr && fileSalt)
      ? await decryptWithFileKeyRaw(cipherB64, iv, fileKeyStr, fileSalt)
      : await decryptDataRaw(cipherB64, iv, activeKey);
    return await decryptedBufferToBlobUrlAsync(rawBuf, contentType || 'image/jpeg');
  } catch {
    let decryptedUrl = '';
    if (fileKeyStr && fileSalt) {
      decryptedUrl = await decryptWithFileKey(cipherB64, iv, fileKeyStr, fileSalt);
    } else {
      decryptedUrl = await decryptData(cipherB64, iv, activeKey);
    }
    if (!decryptedUrl.startsWith('data:') && !decryptedUrl.startsWith('blob:')) {
      decryptedUrl = `data:${contentType || 'image/jpeg'};base64,${decryptedUrl}`;
    }
    return decryptedUrl;
  }
}

export async function decryptDirectTrashItem(
  item: any, activeKey: CryptoKey, fileKeyStr: string | null
): Promise<string> {
  const contentType = item.contentType || 'image/jpeg';
  try {
    return await tryDecryptPayload(item.ciphertext, item.iv, contentType, activeKey, fileKeyStr, item.fileSalt);
  } catch (primaryErr) {
    if (item.thumbnailCiphertext && (item.thumbnailIv || item.iv)) {
      return await tryDecryptPayload(
        item.thumbnailCiphertext,
        item.thumbnailIv || item.iv,
        'image/jpeg',
        activeKey,
        fileKeyStr,
        item.fileSalt
      );
    }
    throw primaryErr;
  }
}
