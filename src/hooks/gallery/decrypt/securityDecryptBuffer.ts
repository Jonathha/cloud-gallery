import { decryptData } from '../../../utils/crypto';
import { decryptWithFileKey } from '../../../utils/fileCrypto';

export async function decryptSecurityBuffer(
  cipher: string, iv: string, fileKey: string | null, salt: string | undefined, combinedKey: CryptoKey
): Promise<string> {
  if (fileKey && salt) {
    try { return await decryptWithFileKey(cipher, iv, fileKey, salt); }
    catch { return await decryptData(cipher, iv, combinedKey); }
  }
  return await decryptData(cipher, iv, combinedKey);
}
