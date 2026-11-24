import { openDB, IDBPDatabase } from 'idb';
import { QuickAccessDB } from './types';

let qaDbPromise: Promise<IDBPDatabase<QuickAccessDB>> | null = null;

export async function getQuickAccessDB(): Promise<IDBPDatabase<QuickAccessDB>> {
  if (!qaDbPromise) {
    qaDbPromise = openDB<QuickAccessDB>('vault-quick-access-cache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('thumbnails')) {
          const store = db.createObjectStore('thumbnails', { keyPath: 'id' });
          store.createIndex('by-userId', 'userId');
        }
      },
      terminated() {
        qaDbPromise = null;
      }
    });
  }
  return qaDbPromise;
}

export async function withQADB<T>(action: (db: IDBPDatabase<QuickAccessDB>) => Promise<T>): Promise<T> {
  try {
    const db = await getQuickAccessDB();
    return await action(db);
  } catch (error: any) {
    if (error?.name === 'InvalidStateError' || error?.message?.includes('closing') || error?.message?.includes('closed')) {
      qaDbPromise = null;
      const db = await getQuickAccessDB();
      return await action(db);
    }
    throw error;
  }
}
