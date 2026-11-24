import { decryptData } from '../crypto';
import { isQuickAccessEnabled, getActiveQuickAccessUid } from '../quickAccess';
import { sessionDecryptedCache } from '../../hooks/gallery/decrypt/sessionCache';
import { saveAspectRatio } from '../aspectRatioCache';
import { withQADB } from './db';
import { knownCachedIds, QuickAccessThumbnailRecord } from './types';

/**
 * Hydrates RAM sessionDecryptedCache from local persistent storage in parallel.
 * Operates strictly when Quick Access is active.
 */
export async function hydrateQuickAccessThumbnails(
  userId: string,
  cryptoKey: CryptoKey | null | undefined,
  decryptedCache?: Map<string, string>,
  targetIds?: string[]
): Promise<number> {
  const targetUid = userId || getActiveQuickAccessUid();
  if (!targetUid || !isQuickAccessEnabled(targetUid) || !cryptoKey) {
    return 0;
  }

  try {
    const records = await withQADB(async db => {
      try {
        if (targetIds && targetIds.length > 0) {
          const tx = db.transaction('thumbnails', 'readonly');
          const store = tx.objectStore('thumbnails');
          const results = await Promise.all(targetIds.map(id => store.get(id)));
          return results.filter(Boolean) as QuickAccessThumbnailRecord[];
        }
        return await db.getAll('thumbnails');
      } catch {
        return [];
      }
    });

    if (!records || records.length === 0) return 0;
    const userRecords = records.filter(r => !r.userId || r.userId === targetUid);
    let count = 0;

    await Promise.all(
      userRecords.map(async rec => {
        try {
          knownCachedIds.add(rec.id);
          if (sessionDecryptedCache.has(rec.id)) return;
          const dataUrl = await decryptData(rec.ciphertext, rec.iv, cryptoKey);
          if (dataUrl) {
            sessionDecryptedCache.set(rec.id, dataUrl);
            if (decryptedCache) decryptedCache.set(rec.id, dataUrl);
            if (rec.aspectRatio) saveAspectRatio(rec.id, rec.aspectRatio);
            count++;
          }
        } catch {}
      })
    );
    return count;
  } catch (err) {
    console.warn('[QuickAccessCache] Hydration failed:', err);
    return 0;
  }
}
