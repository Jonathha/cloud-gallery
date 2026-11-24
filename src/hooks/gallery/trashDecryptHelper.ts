import { TrashImage } from './trash/types';
import { resolveTrashKeys } from './trash/trashKeyDerivation';
import { decryptChunkedTrashItem } from './trash/chunkedTrashDecrypt';
import { decryptDirectTrashItem } from './trash/directTrashDecrypt';

export * from './trash/types';

export async function decryptSingleTrashItem(
  item: any, cryptoKey: CryptoKey | null | undefined, extraPassword: string | null | undefined
): Promise<TrashImage | null> {
  const isVideo = item?.contentType?.startsWith('video/') || false;
  const base = {
    id: item?.id,
    createdAt: item?.createdAt,
    deletedAt: item?.deletedAt || item?.trashedAt,
    trashedAt: item?.trashedAt || item?.deletedAt,
    restoredAt: item?.restoredAt,
    protectedAt: item?.protectedAt,
    isVideo,
  };
  try {
    if (!cryptoKey || (!item.ciphertext && !item.thumbnailCiphertext) || (!item.iv && !item.thumbnailIv)) {
      return null;
    }
    const isChunked = item.isChunked || item.ciphertext === 'chunked_vault_data';
    const { activeKey, fileKeyStr } = await resolveTrashKeys(item, cryptoKey, extraPassword);
    if (isChunked) {
      const { decryptedUrl, noThumbnail } = await decryptChunkedTrashItem(item, activeKey, fileKeyStr);
      return { ...base, url: decryptedUrl, noThumbnail };
    }
    const url = await decryptDirectTrashItem(item, activeKey, fileKeyStr);
    return { ...base, url };
  } catch {
    if (item?.id) {
      return { ...base, url: '', noThumbnail: true };
    }
    return null;
  }
}
