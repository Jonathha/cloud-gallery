import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { removeThumbnailFromQuickAccessCache, clearQuickAccessCache } from './quickAccessCache';
import { sessionDecryptedCache } from '../hooks/gallery/decrypt/sessionCache';
import { revokeImageObjectURL, revokeVideoObjectURL } from './fileCrypto/objectUrls';

interface VaultDB extends DBSchema {
  keys: {
    key: string; // user uid
    value: CryptoKey;
  };
  images: {
    key: string; // image id
    value: {
      id: string;
      userId?: string;
      ciphertext: string | Uint8Array | ArrayBuffer;
      iv: string;
      createdAt: any;
      isChunked?: boolean;
      chunkCount?: number;
      contentType?: string;
      totalSize?: number;
      thumbnailCiphertext?: string;
      thumbnailIv?: string;
      fileKeyCiphertext?: string;
      fileKeyIv?: string;
      fileSalt?: string;
      isLocalPending?: boolean;
      isSyncPending?: boolean;
    };
  };
  trash: {
    key: string; // image id
    value: {
      id: string;
      userId?: string;
      ciphertext: string | Uint8Array | ArrayBuffer;
      iv: string;
      createdAt: any;
      deletedAt?: number;
      trashedAt?: number | any;
      restoredAt?: number | any;
      protectedAt?: number | any;
      isChunked?: boolean;
      chunkCount?: number;
      contentType?: string;
      totalSize?: number;
      thumbnailCiphertext?: string;
      thumbnailIv?: string;
      fileKeyCiphertext?: string;
      fileKeyIv?: string;
      fileSalt?: string;
      isProtected?: boolean;
      auxKey?: string;
      isLocalPending?: boolean;
      isSyncPending?: boolean;
    };
  };
  protected_keys: {
    key: string; // image id
    value: {
      id: string;
      auxKey: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<VaultDB>> | null = null;

export async function getDB(): Promise<IDBPDatabase<VaultDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VaultDB>('secure-vault-db', 3, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('trash')) {
          db.createObjectStore('trash', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('protected_keys')) {
          db.createObjectStore('protected_keys', { keyPath: 'id' });
        }
      },
      terminated() {
        dbPromise = null;
      }
    });
  }
  return dbPromise;
}

async function withDB<T>(action: (db: IDBPDatabase<VaultDB>) => Promise<T>): Promise<T> {
  try {
    const db = await getDB();
    return await action(db);
  } catch (error: any) {
    if (error.name === 'InvalidStateError' || error.message?.includes('closing') || error.message?.includes('closed')) {
      dbPromise = null;
      const db = await getDB();
      return await action(db);
    }
    throw error;
  }
}

// Key Management
export async function saveKeyToLocal(uid: string, key: CryptoKey) {
  return withDB(db => db.put('keys', key, uid));
}

export async function getKeyFromLocal(uid: string): Promise<CryptoKey | undefined> {
  return withDB(db => db.get('keys', uid));
}

export async function removeKeyFromLocal(uid: string) {
  return withDB(db => db.delete('keys', uid));
}

// Image Cache Management
export async function saveImageToCache(image: { 
  id: string; 
  userId?: string;
  ciphertext: string | Uint8Array | ArrayBuffer; 
  iv: string; 
  createdAt: any; 
  isChunked?: boolean;
  chunkCount?: number;
  contentType?: string;
  totalSize?: number;
  thumbnailCiphertext?: string;
  thumbnailIv?: string;
  fileKeyCiphertext?: string;
  fileKeyIv?: string;
  fileSalt?: string;
  isLocalPending?: boolean;
  isSyncPending?: boolean;
}) {
  return withDB(db => db.put('images', image));
}

export async function getImageFromCache(id: string) {
  return withDB(db => db.get('images', id));
}

export async function removeImageFromCache(id: string) {
  removeThumbnailFromQuickAccessCache(id).catch(() => {});
  try {
    sessionDecryptedCache.delete(id);
    revokeImageObjectURL(id);
    revokeVideoObjectURL(id);
  } catch {}
  return withDB(db => db.delete('images', id));
}

export async function clearImageCache() {
  clearQuickAccessCache().catch(() => {});
  return withDB(db => db.clear('images'));
}

export async function getAllImagesFromCache(userId?: string) {
  const images = await withDB(db => db.getAll('images'));
  if (!userId) return images;
  return images.filter(img => !img.userId || img.userId === userId);
}

// Trash Management
export async function saveToTrash(item: { 
  id: string; 
  userId?: string;
  ciphertext: string | Uint8Array | ArrayBuffer; 
  iv: string; 
  createdAt: any; 
  trashedAt?: number | any;
  restoredAt?: number | any;
  protectedAt?: number | any;
  deletedAt?: number | any; 
  isChunked?: boolean;
  chunkCount?: number;
  contentType?: string;
  totalSize?: number;
  thumbnailCiphertext?: string;
  thumbnailIv?: string;
  fileKeyCiphertext?: string;
  fileKeyIv?: string;
  fileSalt?: string;
  isProtected?: boolean;
  auxKey?: string;
}) {
  return withDB(db => db.put('trash', item));
}

export async function getTrashItems(userId?: string) {
  const items = await withDB(db => db.getAll('trash'));
  if (!userId) return items;
  return items.filter(item => !item.userId || item.userId === userId);
}

export async function getImageFromTrash(id: string) {
  return withDB(db => db.get('trash', id));
}

export async function removeFromTrash(id: string) {
  return withDB(db => db.delete('trash', id));
}

export async function removeManyFromTrash(ids: string[]) {
  if (ids.length === 0) return;
  return withDB(async (db) => {
    const tx = db.transaction('trash', 'readwrite');
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
  });
}

export async function clearTrash() {
  return withDB(db => db.clear('trash'));
}

// Protected Security Keys Cache Management
export async function saveAuxKeyToCache(id: string, auxKey: string) {
  return withDB(db => db.put('protected_keys', { id, auxKey }));
}

export async function getAuxKeyFromCache(id: string): Promise<string | undefined> {
  const record = await withDB(db => db.get('protected_keys', id));
  return record?.auxKey;
}

export async function removeAuxKeyFromCache(id: string) {
  return withDB(db => db.delete('protected_keys', id));
}

export async function migrateIndexedDBKeys(oldUid: string, newUid: string) {
  return withDB(async db => {
    const key = await db.get('keys', oldUid);
    if (key) {
      await db.put('keys', key, newUid);
      await db.delete('keys', oldUid);
    }
  });
}
