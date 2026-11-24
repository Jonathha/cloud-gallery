import { withQADB } from './db';
import { knownCachedIds, inFlightSaves } from './types';

/**
 * Clears the persistent thumbnail cache when Quick Access is disabled.
 */
export async function clearQuickAccessCache(userId?: string): Promise<void> {
  knownCachedIds.clear();
  inFlightSaves.clear();
  try {
    if (!userId) {
      await withQADB(db => db.clear('thumbnails'));
      return;
    }

    await withQADB(async db => {
      const records = await db.getAllFromIndex('thumbnails', 'by-userId', userId);
      if (records && records.length > 0) {
        const tx = db.transaction('thumbnails', 'readwrite');
        for (const rec of records) {
          await tx.store.delete(rec.id);
        }
        await tx.done;
      }
    });
  } catch (err) {
    console.warn('[QuickAccessCache] Error clearing cache:', err);
  }
}

export function resetQuickAccessMemoryIndices(): void {
  knownCachedIds.clear();
  inFlightSaves.clear();
}
