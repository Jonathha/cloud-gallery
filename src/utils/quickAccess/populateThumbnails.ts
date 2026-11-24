import { isQuickAccessEnabled, getActiveQuickAccessUid } from '../quickAccess';
import { sessionDecryptedCache } from '../../hooks/gallery/decrypt/sessionCache';
import { withQADB } from './db';
import { knownCachedIds, inFlightSaves } from './types';
import { saveThumbnailToQuickAccessCache } from './saveThumbnail';
import { resolveItemDataUrl } from './populateItemDecrypt';

export async function populateMissingQuickAccessThumbnails(
  userId: string,
  items: any[],
  cryptoKey: CryptoKey | null | undefined
): Promise<void> {
  const targetUid = userId || getActiveQuickAccessUid();
  if (!targetUid || !isQuickAccessEnabled(targetUid) || !cryptoKey || !items || items.length === 0) {
    return;
  }

  try {
    const existingKeys = await withQADB(async db => {
      try {
        const keys = await db.getAllKeys('thumbnails');
        const keySet = new Set(keys.map(k => String(k)));
        for (const k of keySet) knownCachedIds.add(k);
        return keySet;
      } catch {
        return new Set<string>();
      }
    });

    const missingItems = items.filter(
      item => item && item.id && !existingKeys.has(item.id) && !knownCachedIds.has(item.id) && !inFlightSaves.has(item.id)
    );

    if (missingItems.length === 0) return;
    const batchSize = 6;
    for (let i = 0; i < missingItems.length; i += batchSize) {
      if (!isQuickAccessEnabled(targetUid)) break;
      const batch = missingItems.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async item => {
          try {
            if (knownCachedIds.has(item.id) || inFlightSaves.has(item.id)) return;
            let dataUrl = sessionDecryptedCache.get(item.id);
            if (!dataUrl) dataUrl = (await resolveItemDataUrl(item, cryptoKey)) || undefined;
            if (dataUrl) {
              sessionDecryptedCache.set(item.id, dataUrl);
              await saveThumbnailToQuickAccessCache(targetUid, item.id, dataUrl, cryptoKey);
              existingKeys.add(item.id);
            }
          } catch {}
        })
      );
      await new Promise(r => setTimeout(r, 40));
    }
  } catch (err) {
    console.warn('[QuickAccessCache] Background population failed:', err);
  }
}
