import React from "react";
import { fetchAndUnpackImage, decryptFileKey, decryptWithFileKeyRaw, encryptWithFileKey } from "../../../utils/fileCrypto";
import { saveImageToCache } from "../../../utils/db";
import { DecryptedImage } from "../../../types";
import { bytesToBase64 } from "../../../utils/crypto";

// Global map to prevent concurrent downloads of the same imageId
const activeSyncDownloads = new Map<string, Promise<any>>();

export async function executeBackgroundSyncHelper(
  itemsToSync: any[],
  token: string,
  setBackgroundSyncing: (val: boolean) => void,
  setBackgroundSyncProgress: (val: number) => void,
  setImages: React.Dispatch<React.SetStateAction<DecryptedImage[]>>,
  cryptoKey?: CryptoKey | null
) {
  if (!itemsToSync || itemsToSync.length === 0) return;
  setBackgroundSyncing(true);
  let syncedCount = 0;
  for (const item of itemsToSync) {
    // Prevent duplicate downloads
    if (activeSyncDownloads.has(item.id)) {
      try {
        await activeSyncDownloads.get(item.id);
      } catch (e) {
        console.warn("Concurrent download failed for item", item.id, e);
      }
      syncedCount++;
      setBackgroundSyncProgress(Math.round((syncedCount / itemsToSync.length) * 100));
      continue;
    }

    const syncPromise = (async () => {
      let fileData = null;
      let attempts = 3;
      let delayMs = 1000;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          fileData = await fetchAndUnpackImage(item.id, token);
          break; // Success!
        } catch (e: any) {
          if (e.message && e.message.includes('404')) {
            if (attempt < attempts) {
              console.log(`[Background Sync] 404 for item ${item.id}. Attempt ${attempt}/${attempts}. Retrying in ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              delayMs *= 2; // exponential backoff
              continue;
            }
          }
          // Out of attempts or not a 404
          throw e;
        }
      }

      if (!fileData || !fileData.ciphertext || fileData.ciphertext === "chunked_vault_data") {
        throw new Error("Mídia vazia ou inválida baixada do servidor");
      }

      // VALIDATE ENVELOPES AND DECRYPTION BEFORE SAVING TO INDEXEDDB
      // We must test if we can successfully decrypt the downloaded ciphertext
      const isVideo = item.contentType?.startsWith("video/") || false;
      let decryptedBuffer: ArrayBuffer | null = null;
      let fileKeyStr = "";

      if (cryptoKey && item.fileKeyCiphertext && item.fileKeyIv && item.fileSalt) {
        try {
          fileKeyStr = await decryptFileKey(item.fileKeyCiphertext, item.fileKeyIv, cryptoKey);
          decryptedBuffer = await decryptWithFileKeyRaw(fileData.ciphertext, fileData.iv, fileKeyStr, item.fileSalt);
        } catch (decryptErr) {
          console.error(`[Background Sync] Decryption validation failed for item ${item.id}:`, decryptErr);
          throw new Error("Falha na descriptografia da mídia de fundo: chave inválida ou arquivo corrompido");
        }
      } else {
        // If no file key or master key, we cannot fully validate, but we proceed if it's legacy/no-crypto
        console.warn(`[Background Sync] Skipping decryption validation for item ${item.id} because crypto keys are missing`);
      }

      // If we validated successfully, align the cache format
      // Only save if it's a valid media that succeeded decryption test
      await saveImageToCache({
        id: item.id,
        ciphertext: fileData.ciphertext,
        iv: fileData.iv,
        createdAt: fileData.createdAt || item.createdAt || Date.now(),
        isChunked: false,
        chunkCount: 1,
        contentType: fileData.contentType || item.contentType || "image/png",
        totalSize: fileData.totalSize || item.totalSize || 0,
        thumbnailCiphertext: fileData.thumbnailCiphertext || item.thumbnailCiphertext || "",
        thumbnailIv: fileData.thumbnailIv || item.thumbnailIv || "",
        fileKeyCiphertext: fileData.fileKeyCiphertext || item.fileKeyCiphertext,
        fileKeyIv: fileData.fileKeyIv || item.fileKeyIv,
        fileSalt: fileData.fileSalt || item.fileSalt,
      });

      console.log(`[Background Sync] Successfully validated, aligned, and cached item ${item.id}`);
    })();

    activeSyncDownloads.set(item.id, syncPromise);

    try {
      await syncPromise;
    } catch (e) {
      console.warn("Silent background sync failed for item", item.id, e);
      // DO NOT delete document from Firestore. We just keep it as is.
    } finally {
      activeSyncDownloads.delete(item.id);
    }

    syncedCount++;
    setBackgroundSyncProgress(Math.round((syncedCount / itemsToSync.length) * 100));
  }
  setBackgroundSyncing(false);
  setBackgroundSyncProgress(0);
}
