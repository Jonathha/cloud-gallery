import { getImageFromCache } from "../../../utils/db";
import { resolveSecurityKey } from "../mediaSecurity";
import { loadVideoFromCache } from "../mediaVideoCacheLoader";
import { loadVideoFromRemote } from "../mediaVideoRemoteLoader";
import { loadImageFromCache } from "../mediaImageCacheLoader";
import { loadImageFromRemote } from "../mediaImageRemoteLoader";
import { PerformFetchParams } from "./types";
import { getSafeAuthToken } from "../../../utils/safeAuthToken";

export async function performMediaFetch({
  img, isVideo, isPreload, cryptoKey, securityImageId, isExtraUnlocked,
  extraPassword, user, setSelectedImage, setDownloadingFull, setFullDownloadProgress, getActiveId
}: PerformFetchParams) {
  const activeKey = await resolveSecurityKey(img.id, cryptoKey!, securityImageId, isExtraUnlocked, extraPassword);
  if (!isPreload) setDownloadingFull(true);
  let decryptedFromCache = false;
  const cached = await getImageFromCache(img.id);
  if (cached?.ciphertext && cached.ciphertext !== "chunked_vault_data") {
    if (isVideo) {
      decryptedFromCache = await loadVideoFromCache(img, cached, activeKey, isPreload, setSelectedImage, setFullDownloadProgress, getActiveId);
    } else {
      decryptedFromCache = await loadImageFromCache(img, cached, activeKey, isPreload, setSelectedImage, getActiveId);
    }
  }
  if (!decryptedFromCache && user) {
    if (!isPreload) setFullDownloadProgress("Carregando do cofre seguro...");
    const token = await getSafeAuthToken(user);
    if (isVideo) {
      await loadVideoFromRemote(img, token, activeKey, cached, isPreload, setSelectedImage, setFullDownloadProgress, getActiveId, user?.uid);
    } else {
      await loadImageFromRemote(img, token, activeKey, cached, isPreload, setSelectedImage, getActiveId, user?.uid);
    }
  }
}
