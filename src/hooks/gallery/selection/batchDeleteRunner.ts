import { getImageFromCache, removeImageFromCache, saveToTrash } from '../../../utils/db';
import { fetchAndUnpackImage } from '../../../utils/fileCrypto';
import { bytesToBase64 } from '../../../utils/crypto';
import { getApiUrl } from '../../../utils/apiUrl';
import { getSafeAuthToken } from '../../../utils/safeAuthToken';
import { batchTrashProgressService } from '../../../services/batchTrashProgressService';
import { addPendingServerDelete } from '../../../utils/pendingServerDeletes';

async function normalizeCiphertext(cipher: any): Promise<string> {
  if (!cipher) return '';
  if (typeof cipher === 'string') return cipher;
  if (cipher instanceof Uint8Array) return await bytesToBase64(cipher);
  if (cipher instanceof ArrayBuffer) return await bytesToBase64(new Uint8Array(cipher));
  return '';
}

export async function deleteSingleItem(id: string, user: any, existingToken?: string): Promise<boolean> {
  try {
    const cached = await getImageFromCache(id);
    let token = existingToken;
    if (!token && user) {
      try {
        token = await getSafeAuthToken(user);
      } catch {}
    }

    let cipherStr = await normalizeCiphertext(cached?.ciphertext);
    const hasCorruptedIv = Boolean(
      cached?.thumbnailIv &&
      cached?.iv === cached?.thumbnailIv &&
      cached?.thumbnailCiphertext &&
      cipherStr &&
      cipherStr !== cached.thumbnailCiphertext
    );

    let mergedItem: any = cached ? { ...cached } : { id };

    if ((!cipherStr || cipherStr === 'chunked_vault_data' || hasCorruptedIv) && token) {
      try {
        const fetched = await fetchAndUnpackImage(id, token);
        if (fetched?.ciphertext) {
          const fetchedCipher = await normalizeCiphertext(fetched.ciphertext);
          mergedItem = {
            ...cached,
            ...fetched,
            id,
            userId: user?.uid || fetched.userId || cached?.userId,
            ciphertext: fetchedCipher,
            iv: fetched.iv || cached?.iv || '',
            createdAt: cached?.createdAt || fetched.createdAt || Date.now(),
            thumbnailCiphertext: fetched.thumbnailCiphertext || cached?.thumbnailCiphertext || '',
            thumbnailIv: fetched.thumbnailIv || cached?.thumbnailIv || '',
            fileKeyCiphertext: fetched.fileKeyCiphertext || cached?.fileKeyCiphertext,
            fileKeyIv: fetched.fileKeyIv || cached?.fileKeyIv,
            fileSalt: fetched.fileSalt || cached?.fileSalt,
          };
          cipherStr = fetchedCipher;
        }
      } catch {}
    }

    if ((!cipherStr || cipherStr === 'chunked_vault_data') && mergedItem?.thumbnailCiphertext && (mergedItem?.thumbnailIv || mergedItem?.iv)) {
      cipherStr = mergedItem.thumbnailCiphertext;
      mergedItem.iv = mergedItem.thumbnailIv || mergedItem.iv;
    }

    if (!cipherStr || !mergedItem?.iv) {
      return false;
    }

    const now = Date.now();
    await saveToTrash({
      ...mergedItem,
      id,
      userId: user?.uid || mergedItem.userId,
      ciphertext: cipherStr,
      iv: mergedItem.iv,
      createdAt: mergedItem.createdAt || now,
      trashedAt: now,
      deletedAt: now,
    });

    await removeImageFromCache(id);
    window.dispatchEvent(new CustomEvent('trash-updated'));

    try {
      const deletedList = JSON.parse(sessionStorage.getItem('recently_deleted_ids_v1') || '[]');
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        sessionStorage.setItem('recently_deleted_ids_v1', JSON.stringify(deletedList));
      }
    } catch {}

    let serverDeleted = false;
    if (navigator.onLine) {
      try {
        const res = await fetch(getApiUrl(`/api/storage/image/${id}`), {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        serverDeleted = res.ok;
      } catch {}
    }
    if (!serverDeleted) addPendingServerDelete(user?.uid || mergedItem.userId, id);
    return true;
  } catch {
    return false;
  }
}

export async function runBatchDelete(ids: string[], user: any, toastPrefix: string, showToast: (m: string, t?: any) => void): Promise<{ okIds: string[] }> {
  try {
    let token: string | undefined;
    try {
      token = await getSafeAuthToken(user);
    } catch {}

    // Initialize progress tracking (only displays if > 5 items and device lags > 450ms)
    batchTrashProgressService.start(ids.length);

    // Controlled concurrency to prevent locking slower devices or crashing IndexedDB
    const concurrency = 2;
    const results: boolean[] = new Array(ids.length).fill(false);
    let completedCount = 0;

    for (let i = 0; i < ids.length; i += concurrency) {
      const batch = ids.slice(i, i + concurrency);
      const batchRes = await Promise.all(
        batch.map((id) => deleteSingleItem(id, user, token))
      );
      for (let j = 0; j < batchRes.length; j++) {
        results[i + j] = batchRes[j];
      }
      completedCount += batch.length;
      batchTrashProgressService.update(completedCount, ids.length);

      // Micro-yield between batches so UI stays responsive and animation frames are smooth
      if (ids.length > 5 && i + concurrency < ids.length) {
        await new Promise((r) => setTimeout(r, 25));
      }
    }

    const success = results.filter(Boolean).length;
    batchTrashProgressService.finish(success, ids.length);

    if (success < ids.length) {
      window.dispatchEvent(new CustomEvent('refresh-gallery-list'));
      showToast(`${success} mídias movidas para a lixeira. ${ids.length - success} não puderam ser movidas.`, 'error');
    } else {
      showToast(`${success} ${toastPrefix} movidas para a lixeira!`);
    }
    return { okIds: ids.filter((_, i) => results[i]) };
  } catch {
    batchTrashProgressService.finish(0, ids.length);
    window.dispatchEvent(new CustomEvent('refresh-gallery-list'));
    showToast('Erro ao excluir mídias.', 'error');
    return { okIds: [] };
  }
}
