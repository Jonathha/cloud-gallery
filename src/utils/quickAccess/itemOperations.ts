import { decryptData } from '../crypto';
import { isQuickAccessEnabled, getActiveQuickAccessUid } from '../quickAccess';
import { saveAspectRatio } from '../aspectRatioCache';
import { withQADB } from './db';
import { knownCachedIds, inFlightSaves } from './types';

/**
 * Retrieves a single thumbnail from persistent cache if available.
 */
export async function getQuickAccessThumbnail(
  id: string,
  cryptoKey: CryptoKey,
  userId?: string
): Promise<{ url: string; aspectRatio?: number } | null> {
  const targetUid = userId || getActiveQuickAccessUid();
  if (!targetUid || !isQuickAccessEnabled(targetUid) || !cryptoKey || !id) {
    return null;
  }

  try {
    const rec = await withQADB(db => db.get('thumbnails', id));
    if (!rec) return null;

    const dataUrl = await decryptData(rec.ciphertext, rec.iv, cryptoKey);
    if (!dataUrl) return null;

    knownCachedIds.add(id);
    if (rec.aspectRatio) {
      saveAspectRatio(id, rec.aspectRatio);
    }
    return { url: dataUrl, aspectRatio: rec.aspectRatio };
  } catch {
    return null;
  }
}

/**
 * Removes a thumbnail from persistent cache when deleted.
 */
export async function removeThumbnailFromQuickAccessCache(id: string): Promise<void> {
  knownCachedIds.delete(id);
  inFlightSaves.delete(id);
  try {
    await withQADB(db => db.delete('thumbnails', id));
  } catch (err) {
    console.warn('[QuickAccessCache] Error removing thumbnail:', err);
  }
}
