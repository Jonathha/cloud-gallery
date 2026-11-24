import { processAndSetImagesHelper } from "../processImages";
import { executeBackgroundSyncHelper } from "../backgroundSync";
import { loadImagesHelper } from "../fetchImages";

export function createMediaLoaderActions(state: any, auth: any, isExtraUnlocked?: boolean) {
  const processAndSetImages = async (imageList: any[], append = false) => {
    await processAndSetImagesHelper(imageList, append, auth.securityImageId, isExtraUnlocked, auth.extraPassword, auth.cryptoKey, state.decryptedCache.current, state.setImages, state.setLoading);
  };
  const executeBackgroundSync = async (itemsToSync: any[], token: string) => {
    await executeBackgroundSyncHelper(itemsToSync, token, state.setBackgroundSyncing, state.setBackgroundSyncProgress, state.setImages, auth.cryptoKey, auth.user?.uid);
  };
  const loadImages = async () => {
    const sequence = ++state.loadSequenceRef.current;
    const isCurrent = () => state.loadSequenceRef.current === sequence;
    await loadImagesHelper({
      user: auth.user, cryptoKey: auth.cryptoKey, decryptedCache: state.decryptedCache, setImages: state.setImages,
      setLoading: state.setLoading, setSyncStatus: state.setSyncStatus, processAndSetImages,
      migrationDismissedRef: state.migrationDismissedRef, setIsMigrationNeeded: state.setIsMigrationNeeded,
      setMigrationItems: state.setMigrationItems, pendingSyncRef: state.pendingSyncRef,
      setCloudMediaCount: state.setCloudMediaCount, setShowDownloadPrompt: state.setShowDownloadPrompt, executeBackgroundSync,
      isCurrent
    });
  };
  return { processAndSetImages, executeBackgroundSync, loadImages };
}
