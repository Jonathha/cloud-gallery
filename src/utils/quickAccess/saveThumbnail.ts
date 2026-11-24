import { encryptData } from '../crypto';
import { isQuickAccessEnabled, getActiveQuickAccessUid } from '../quickAccess';
import { saveAspectRatio, getCachedAspectRatio } from '../aspectRatioCache';
import { withQADB } from './db';
import { inFlightSaves, knownCachedIds } from './types';

/**
 * Persists an encrypted thumbnail into the local persistent cache when Quick Access is ON.
 * Includes in-memory deduplication to avoid redundant crypto/IDB overhead.
 */
export async function saveThumbnailToQuickAccessCache(
  userId: string | null | undefined,
  id: string,
  dataUrl: string,
  cryptoKey: CryptoKey | null | undefined,
  aspectRatio?: number
): Promise<void> {
  const targetUid = userId || getActiveQuickAccessUid();
  if (!targetUid || !isQuickAccessEnabled(targetUid) || !cryptoKey || !id || !dataUrl) {
    return;
  }

  if (knownCachedIds.has(id) || inFlightSaves.has(id)) {
    return;
  }

  inFlightSaves.add(id);
  try {
    const ratio = aspectRatio || getCachedAspectRatio(id);
    const { ciphertext, iv } = await encryptData(dataUrl, cryptoKey);
    await withQADB(db =>
      db.put('thumbnails', {
        id,
        userId: targetUid,
        ciphertext,
        iv,
        aspectRatio: ratio || undefined,
        updatedAt: Date.now()
      })
    );
    knownCachedIds.add(id);
  } catch (err) {
    console.warn('[QuickAccessCache] Error saving thumbnail:', err);
  } finally {
    inFlightSaves.delete(id);
  }
}
