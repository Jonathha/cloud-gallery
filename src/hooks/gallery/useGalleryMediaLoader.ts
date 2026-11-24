import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useMediaLoaderState } from "./useGalleryMediaLoader/state/useMediaLoaderState";
import { createMediaLoaderActions } from "./useGalleryMediaLoader/state/useMediaLoaderActions";
import { decryptSingleThumbnail } from "./galleryDecryptHelper";
import { getImageFromCache } from "../../utils/db";
import { flushPendingServerDeletes } from "../../utils/pendingServerDeletes";
import { dueFailedThumbnails, hasPendingRecovery, beginRecovery, endRecovery, subscribeFailedThumbnails } from "./decrypt/thumbnailRetry";

export function useGalleryMediaLoader(_showToast: (msg: string, type?: "success" | "error") => void, isExtraUnlocked?: boolean) {
  const auth = useAuth();
  const state = useMediaLoaderState();
  const { executeBackgroundSync, loadImages } = createMediaLoaderActions(state, auth, isExtraUnlocked);

  const completeMigration = (cancelled?: boolean) => {
    state.setIsMigrationNeeded(false); state.setMigrationItems([]);
    if (cancelled) state.migrationDismissedRef.current = true; else loadImages();
  };
  const onSelectFullDownload = () => {
    localStorage.setItem('gallery_download_pref', 'full'); sessionStorage.setItem('gallery_download_pref', 'full');
    state.setShowDownloadPrompt(false);
    if (state.pendingSyncRef.current?.items?.length) executeBackgroundSync(state.pendingSyncRef.current.items, state.pendingSyncRef.current.token);
  };
  const onSelectThumbnailsOnly = () => {
    localStorage.setItem('gallery_download_pref', 'thumbnails_only'); sessionStorage.setItem('gallery_download_pref', 'thumbnails_only');
    state.setShowDownloadPrompt(false);
  };

  useEffect(() => {
    if (!auth.isAuthReady || !auth.user || !auth.cryptoKey) return;
    loadImages();
    const handleRefresh = () => loadImages();
    const handleOnline = () => { flushPendingServerDeletes(auth.user).catch(() => {}); };
    window.addEventListener("refresh-gallery-list", handleRefresh);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("refresh-gallery-list", handleRefresh);
      window.removeEventListener("online", handleOnline);
    };
  }, [auth.user, auth.cryptoKey, auth.isAuthReady, isExtraUnlocked, auth.securityImageId, auth.extraPassword]);

  // Recuperação individual de miniaturas que falharam (sem recarregar a galeria inteira)
  useEffect(() => {
    if (!auth.isAuthReady || !auth.user || !auth.cryptoKey) return;
    let cancelled = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (ms: number) => {
      if (timer === undefined) timer = setTimeout(() => { timer = undefined; run(); }, ms);
    };
    const run = async () => {
      if (cancelled || running || document.visibilityState === "hidden" || !navigator.onLine) return;
      running = true;
      try {
        for (const id of dueFailedThumbnails()) {
          if (cancelled) break;
          beginRecovery(id);
          let ok = false;
          try {
            const rec = await getImageFromCache(id);
            if (!rec) ok = true;
            else {
              const res = await decryptSingleThumbnail(rec, auth.securityImageId, isExtraUnlocked, auth.extraPassword, auth.cryptoKey, state.decryptedCache.current);
              if (res.url) {
                ok = true;
                if (!cancelled) state.setImages((prev) => prev.map((p) => (p.id === id && !p.url ? { ...p, ...res } : p)));
              }
            }
          } catch {}
          endRecovery(id, ok);
          await new Promise((r) => setTimeout(r, 150 + Math.random() * 150));
        }
      } finally {
        running = false;
      }
      if (!cancelled && hasPendingRecovery()) schedule(8000);
    };
    const unsubscribe = subscribeFailedThumbnails(() => schedule(3000));
    const onVisible = () => { if (document.visibilityState === "visible") schedule(500); };
    const onOnline = () => schedule(500);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    if (hasPendingRecovery()) schedule(3000);
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [auth.user, auth.cryptoKey, auth.isAuthReady, isExtraUnlocked, auth.securityImageId, auth.extraPassword]);

  return { ...state, loadImages, completeMigration, onSelectFullDownload, onSelectThumbnailsOnly };
}
