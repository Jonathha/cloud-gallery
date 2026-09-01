import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { DecryptedImage } from "../../types";
import { processAndSetImagesHelper } from "./useGalleryMediaLoader/processImages";
import { executeBackgroundSyncHelper } from "./useGalleryMediaLoader/backgroundSync";
import { loadImagesHelper } from "./useGalleryMediaLoader/fetchImages";

export function useGalleryMediaLoader(
  showToast: (msg: string, type?: "success" | "error") => void,
  isExtraUnlocked?: boolean
) {
  const { user, cryptoKey, isAuthReady, extraPassword, securityImageId } = useAuth();
  const [images, setImages] = useState<DecryptedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "local-only" | "loading">("loading");
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const [backgroundSyncProgress, setBackgroundSyncProgress] = useState(0);

  const decryptedCache = useRef<Map<string, string>>(new Map());

  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [cloudMediaCount, setCloudMediaCount] = useState(0);
  const pendingSyncRef = useRef<{ items: any[]; token: string } | null>(null);

  const [isMigrationNeeded, setIsMigrationNeeded] = useState(false);
  const [migrationItems, setMigrationItems] = useState<any[]>([]);
  const migrationDismissedRef = useRef(false);

  const completeMigration = (cancelled?: boolean) => {
    setIsMigrationNeeded(false);
    setMigrationItems([]);
    if (cancelled) {
      migrationDismissedRef.current = true;
    } else {
      loadImages();
    }
  };

  const processAndSetImages = async (imageList: any[], append = false) => {
    await processAndSetImagesHelper(
      imageList,
      append,
      securityImageId,
      isExtraUnlocked,
      extraPassword,
      cryptoKey,
      decryptedCache.current,
      setImages,
      setLoading
    );
  };

  const executeBackgroundSync = async (itemsToSync: any[], token: string) => {
    await executeBackgroundSyncHelper(
      itemsToSync,
      token,
      setBackgroundSyncing,
      setBackgroundSyncProgress,
      setImages,
      cryptoKey
    );
  };

  const onSelectFullDownload = () => {
    localStorage.setItem('gallery_download_pref', 'full');
    sessionStorage.setItem('gallery_download_pref', 'full');
    setShowDownloadPrompt(false);
    if (pendingSyncRef.current && pendingSyncRef.current.items.length > 0) {
      executeBackgroundSync(pendingSyncRef.current.items, pendingSyncRef.current.token);
    }
  };

  const onSelectThumbnailsOnly = () => {
    localStorage.setItem('gallery_download_pref', 'thumbnails_only');
    sessionStorage.setItem('gallery_download_pref', 'thumbnails_only');
    setShowDownloadPrompt(false);
  };

  const loadImages = async () => {
    await loadImagesHelper({
      user,
      cryptoKey,
      decryptedCache,
      setImages,
      setLoading,
      setSyncStatus,
      processAndSetImages,
      migrationDismissedRef,
      setIsMigrationNeeded,
      setMigrationItems,
      pendingSyncRef,
      setCloudMediaCount,
      setShowDownloadPrompt,
      executeBackgroundSync,
    });
  };

  useEffect(() => {
    if (!isAuthReady || !user || !cryptoKey) return;
    loadImages();

    const handleRefresh = () => {
      console.log("[useGalleryMedia] Refresh event received, reloading images...");
      loadImages();
    };

    window.addEventListener("refresh-gallery-list", handleRefresh);
    return () => {
      window.removeEventListener("refresh-gallery-list", handleRefresh);
    };
  }, [user, cryptoKey, isAuthReady, isExtraUnlocked, securityImageId, extraPassword]);

  return {
    images,
    setImages,
    loading,
    setLoading,
    syncStatus,
    setSyncStatus,
    backgroundSyncing,
    backgroundSyncProgress,
    loadImages,
    isMigrationNeeded,
    migrationItems,
    completeMigration,
    showDownloadPrompt,
    cloudMediaCount,
    onSelectFullDownload,
    onSelectThumbnailsOnly,
  };
}
