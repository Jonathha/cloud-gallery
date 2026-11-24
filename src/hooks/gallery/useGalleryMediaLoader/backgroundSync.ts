import React from "react";
import { DecryptedImage } from "../../../types";
import { processSyncItem } from "./sync/syncExecutor";

export async function executeBackgroundSyncHelper(
  itemsToSync: any[], token: string,
  setBackgroundSyncing: (val: boolean) => void,
  setBackgroundSyncProgress: (val: number) => void,
  _setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  cryptoKey?: CryptoKey | null,
  currentUserId?: string
) {
  if (!itemsToSync || itemsToSync.length === 0) return;
  setBackgroundSyncing(true);
  let syncedCount = 0;
  for (const item of itemsToSync) {
    await processSyncItem(item, token, cryptoKey, currentUserId || item.userId);
    syncedCount++;
    setBackgroundSyncProgress(Math.round((syncedCount / itemsToSync.length) * 100));
  }
  setBackgroundSyncing(false);
  setBackgroundSyncProgress(0);
}
