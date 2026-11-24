import { deriveKey } from '../../../utils/crypto';
import { decryptFileKey } from '../../../utils/fileCrypto';

export async function resolveTrashKeys(
  item: any, cryptoKey: CryptoKey, extraPassword: string | null | undefined
): Promise<{ activeKey: CryptoKey; fileKeyStr: string | null }> {
  let activeKey = cryptoKey;
  if (item.isProtected && extraPassword && item.auxKey) {
    try {
      const salt = btoa(item.auxKey.slice(0, 16).padEnd(16, "0"));
      activeKey = await deriveKey(extraPassword, salt);
    } catch (e) { console.error('Failed to derive key for protected trash item', e); }
  }
  let fileKeyStr: string | null = null;
  if (item.fileKeyCiphertext && item.fileKeyIv && item.fileSalt) {
    try { fileKeyStr = await decryptFileKey(item.fileKeyCiphertext, item.fileKeyIv, activeKey); }
    catch (e) { console.error('Failed to decrypt file key in trash', e); }
  }
  return { activeKey, fileKeyStr };
}
