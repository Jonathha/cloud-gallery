import { getAllImagesFromCache } from "../../../utils/db";
import { LoadImagesHelperParams } from "./fetch/types";
import { fetchRemoteLists, fetchRemoteVersion } from "./fetch/remoteQueries";
import { mergeRemoteAndCache } from "./fetch/remoteMerge";
import { dispatchRemoteSync } from "./fetch/remoteSyncDispatcher";
import { isQuickAccessEnabled } from "../../../utils/quickAccess";
import { hydrateQuickAccessThumbnails, populateMissingQuickAccessThumbnails } from "../../../utils/quickAccessCache";
import { getTimestamp } from "../../../utils/galleryHelpers";
import { calculateViewportItemsCount } from "./process/viewportCalc";
import { getSafeAuthToken } from "../../../utils/safeAuthToken";
import { flushPendingServerDeletes, getPendingServerDeletes } from "../../../utils/pendingServerDeletes";
import { emitUploadProgress } from "../../../components/gallery/UploadProgressIndicator";

// Cargas simultâneas que mostram o aviso "Carregando da nuvem…"; o aviso some quando a última termina
let cloudLoadingCount = 0;

// Última lista sincronizada com sucesso: só baixa de novo se a versão do servidor mudou
const SYNC_META_MAX_AGE_MS = 6 * 60 * 60 * 1000;
type SyncMeta = { v: string; at: number; missing: boolean };
const syncMetaKey = (uid: string) => `gallery_list_sync:${uid}`;
function readSyncMeta(uid: string): SyncMeta | null {
  try {
    const m = JSON.parse(localStorage.getItem(syncMetaKey(uid)) || "null");
    return m && typeof m.v === "string" && typeof m.at === "number" ? m : null;
  } catch { return null; }
}
function writeSyncMeta(uid: string, meta: SyncMeta) {
  try { localStorage.setItem(syncMetaKey(uid), JSON.stringify(meta)); } catch {}
}

export async function loadImagesHelper(params: LoadImagesHelperParams) {
  const isCurrent = params.isCurrent || (() => true);

  if (sessionStorage.getItem('is_fake_vault_active') === 'true') {
    if (!isCurrent()) return;
    params.setImages([]); params.setLoading(false); params.setSyncStatus("synced"); return;
  }
  if (!params.user || !params.cryptoKey) return;
  let cloudLoadingShown = false;
  try {
    params.setLoading(true);
    const cachedImages = await getAllImagesFromCache(params.user.uid) || [];
    if (!isCurrent()) return;

    if (isQuickAccessEnabled(params.user.uid)) {
      const sorted = [...cachedImages].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
      const viewportCount = calculateViewportItemsCount();
      const viewportIds = sorted.slice(0, viewportCount).map((img) => img.id);

      // Hydrate priority viewport thumbnails immediately
      await hydrateQuickAccessThumbnails(params.user.uid, params.cryptoKey, params.decryptedCache?.current, viewportIds.length > 0 ? viewportIds : undefined);
      if (!isCurrent()) return;

      // Render local cached images immediately to UI
      await params.processAndSetImages(cachedImages, false);
      if (!isCurrent()) return;

      // Se temos imagens em cache, podemos tirar o loading para exibir a galeria imediatamente
      if (cachedImages.length > 0) {
        params.setLoading(false);
      }

      // Hydrate remaining thumbnails in background
      if (sorted.length > viewportCount) {
        hydrateQuickAccessThumbnails(params.user.uid, params.cryptoKey, params.decryptedCache?.current).catch(() => {});
      }

      // Proactively populate missing existing items into Quick Access cache
      populateMissingQuickAccessThumbnails(params.user.uid, cachedImages, params.cryptoKey).catch(() => {});
    } else {
      await params.processAndSetImages(cachedImages, false);
      if (!isCurrent()) return;
    }

    if (!navigator.onLine) {
      if (!isCurrent()) return;
      params.setSyncStatus("local-only");
      params.setLoading(false);
      return;
    }

    // Cache vazio: a galeria só terá fotos depois da nuvem, então avisa no topo que está carregando
    if (cachedImages.length === 0) {
      cloudLoadingShown = true;
      cloudLoadingCount++;
      emitUploadProgress({ active: true, text: "Carregando da nuvem…", source: "cloud-load" });
    }

    const token = await Promise.race([getSafeAuthToken(params.user), new Promise<string>((r) => setTimeout(() => r(""), 2000))]);
    if (!isCurrent()) return;

    // Reenvia exclusões que não chegaram ao servidor antes de listar (limite de 4s para não travar a carga)
    await Promise.race([flushPendingServerDeletes(params.user, token || undefined), new Promise((r) => setTimeout(r, 4000))]).catch(() => {});
    if (!isCurrent()) return;

    // Nada mudou na nuvem desde a última sincronização: usa o cache local e não lê a lista (D1)
    const syncMeta = readSyncMeta(params.user.uid);
    if (syncMeta && cachedImages.length > 0 && !syncMeta.missing && Date.now() - syncMeta.at < SYNC_META_MAX_AGE_MS && getPendingServerDeletes(params.user.uid).length === 0) {
      const serverVersion = await fetchRemoteVersion(params.user, token);
      if (!isCurrent()) return;
      if (serverVersion !== null && serverVersion === syncMeta.v) {
        params.setSyncStatus("synced");
        return;
      }
    }

    const data = await fetchRemoteLists(params.user, token);
    if (!isCurrent()) return;
    let missingFound = false;

    if (data && (data.success === true || Array.isArray(data.images))) {
      const remoteIds = new Set<string>((data.images || []).map((img: any) => img.id));
      const now = Date.now();
      const missing = cachedImages.filter((img) => {
        if (img.userId !== params.user.uid) return false;
        if (remoteIds.has(img.id)) return false;
        // Don't flag active uploads, local pending files, or photos created in the last 10 minutes
        if (img.isLocalPending || img.isSyncPending) return false;
        if (img.createdAt && (now - Number(img.createdAt) < 10 * 60 * 1000)) return false;
        return true;
      });
      missingFound = missing.length > 0;
      if (isCurrent()) {
        params.setIsMigrationNeeded(missing.length > 0 && !params.migrationDismissedRef.current);
        params.setMigrationItems(missing.length > 0 && !params.migrationDismissedRef.current ? missing : []);
      }
    }
    const seen = new Set<string>();
    const pendingDeletes = new Set(getPendingServerDeletes(params.user.uid));
    const remoteList = (data?.images || []).filter((img: any) => !seen.has(img.id) && seen.add(img.id) && !pendingDeletes.has(img.id));
    const isRemoteSuccess = data && (data.success === true || Array.isArray(data.images));

    if (isRemoteSuccess || remoteList.length > 0) {
      const currentCachedImages = await getAllImagesFromCache(params.user.uid) || cachedImages;
      if (!isCurrent()) return;

      const { finalMergedList, newOrAltered } = await mergeRemoteAndCache(currentCachedImages, remoteList, params.user.uid);
      if (!isCurrent()) return;

      if (remoteList.length > 0) {
        dispatchRemoteSync(remoteList, newOrAltered, token, params.pendingSyncRef, params.setCloudMediaCount, params.setShowDownloadPrompt, params.executeBackgroundSync);
      }
      await params.processAndSetImages(finalMergedList, false);
      if (!isCurrent()) return;

      if (isQuickAccessEnabled(params.user.uid)) {
        populateMissingQuickAccessThumbnails(params.user.uid, finalMergedList, params.cryptoKey).catch(() => {});
      }
      // Só registra a versão depois de a lista ter sido baixada e mesclada com sucesso
      if (data && data.version != null && isRemoteSuccess) {
        writeSyncMeta(params.user.uid, { v: String(data.version), at: Date.now(), missing: missingFound });
      }
      params.setSyncStatus("synced");
    } else {
      if (!isCurrent()) return;
      params.setSyncStatus("local-only");
    }
  } catch (err) {
    if (isCurrent()) {
      console.error("Error loading images:", err);
    }
  }
  finally {
    if (cloudLoadingShown) {
      cloudLoadingCount--;
      if (cloudLoadingCount === 0) emitUploadProgress({ active: false, source: "cloud-load" });
    }
    if (isCurrent()) {
      params.setLoading(false);
    }
  }
}
