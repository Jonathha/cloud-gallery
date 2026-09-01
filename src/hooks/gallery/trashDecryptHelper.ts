import { decryptData, deriveKey } from '../../utils/crypto';
import { decryptFileKey, decryptWithFileKey } from '../../utils/fileCrypto';
import { removeFromTrash } from '../../utils/db';

export interface TrashImage {
  id: string;
  url: string;
  createdAt: any;
  deletedAt?: number;
  trashedAt?: number | any;
  restoredAt?: number | any;
  protectedAt?: number | any;
  isVideo?: boolean;
  noThumbnail?: boolean;
}

export async function decryptSingleTrashItem(
  item: any,
  cryptoKey: CryptoKey | null | undefined,
  extraPassword: string | null | undefined
): Promise<TrashImage | null> {
  try {
    if (!cryptoKey) throw new Error('No crypto key');
    if (!item.ciphertext || !item.iv) {
      console.warn(`Trash image ${item.id} is corrupted (missing ciphertext or iv). Removing from trash.`);
      await removeFromTrash(item.id);
      return null;
    }

    const isVideo = item.contentType?.startsWith('video/') || false;
    const isChunked = item.isChunked || item.ciphertext === 'chunked_vault_data';

    let activeKey = cryptoKey;
    if (item.isProtected && extraPassword && item.auxKey) {
      try {
        const salt = btoa(item.auxKey.slice(0, 16).padEnd(16, "0"));
        activeKey = await deriveKey(extraPassword, salt);
      } catch (deriveErr) {
        console.error('Failed to derive combined key for protected trash item', deriveErr);
      }
    }

    let fileKeyStr: string | null = null;
    try {
      if (item.fileKeyCiphertext && item.fileKeyIv && item.fileSalt) {
        fileKeyStr = await decryptFileKey(item.fileKeyCiphertext, item.fileKeyIv, activeKey);
      }
    } catch (e) {
      console.error('Failed to decrypt file key in trash', e);
    }

    if (isChunked) {
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

      return {
        id: item.id,
        url: decryptedUrl,
        createdAt: item.createdAt,
        deletedAt: item.deletedAt || item.trashedAt,
        trashedAt: item.trashedAt || item.deletedAt,
        restoredAt: item.restoredAt,
        protectedAt: item.protectedAt,
        isVideo,
        noThumbnail
      };
    } else {
      let decryptedUrl = '';
      if (fileKeyStr && item.fileSalt) {
        decryptedUrl = await decryptWithFileKey(item.ciphertext, item.iv, fileKeyStr, item.fileSalt);
      } else {
        decryptedUrl = await decryptData(item.ciphertext, item.iv, activeKey);
      }

      if (!decryptedUrl.startsWith('data:') && !decryptedUrl.startsWith('blob:')) {
        decryptedUrl = `data:${item.contentType || "image/jpeg"};base64,${decryptedUrl}`;
      }

      return {
        id: item.id,
        url: decryptedUrl,
        createdAt: item.createdAt,
        deletedAt: item.deletedAt || item.trashedAt,
        trashedAt: item.trashedAt || item.deletedAt,
        restoredAt: item.restoredAt,
        protectedAt: item.protectedAt,
        isVideo
      };
    }
  } catch (error) {
    console.warn(`Trash image ${item.id} could not be decrypted (corrupted or wrong key). Removing from trash.`);
    await removeFromTrash(item.id);
    return null;
  }
}
