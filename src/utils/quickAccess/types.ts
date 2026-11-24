import { DBSchema } from 'idb';

/**
 * Interface do registro persistente de thumbnail criptografada
 */
export interface QuickAccessThumbnailRecord {
  id: string;
  userId: string;
  ciphertext: string;
  iv: string;
  aspectRatio?: number;
  updatedAt: number;
}

/**
 * Esquema de banco de dados IndexedDB do Quick Access Cache
 */
export interface QuickAccessDB extends DBSchema {
  thumbnails: {
    key: string;
    value: QuickAccessThumbnailRecord;
    indexes: { 'by-userId': string };
  };
}

export const inFlightSaves = new Set<string>();
export const knownCachedIds = new Set<string>();

export function isItemInFlight(id: string): boolean {
  return inFlightSaves.has(id);
}

export function isItemCachedInMemory(id: string): boolean {
  return knownCachedIds.has(id);
}

export function clearInMemoryTracking(): void {
  inFlightSaves.clear();
  knownCachedIds.clear();
}
