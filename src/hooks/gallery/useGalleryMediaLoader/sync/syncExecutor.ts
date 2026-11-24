import { activeSyncDownloads } from "./syncState";
import { downloadWithRetry } from "./syncDownloadItem";
import { validateAndSaveSyncItem } from "./syncValidateAndSave";

export async function processSyncItem(item: any, token: string, cryptoKey?: CryptoKey | null, currentUserId?: string) {
  if (activeSyncDownloads.has(item.id)) {
    try { await activeSyncDownloads.get(item.id); } catch {}
    return;
  }
  const syncPromise = (async () => {
    const fileData = await downloadWithRetry(item.id, token);
    await validateAndSaveSyncItem(item, fileData, cryptoKey, currentUserId || item.userId);
  })();
  activeSyncDownloads.set(item.id, syncPromise);
  try { await syncPromise; } catch {}
  finally { activeSyncDownloads.delete(item.id); }
}
