import { activeVideoObjectUrls, videoUsageOrder, pinnedVideoObjectUrls, trimVideoCache } from "./videoState";

export function registerVideoObjectURL(id: string, url: string) {
  const oldUrl = activeVideoObjectUrls.get(id);
  if (oldUrl && oldUrl !== url) URL.revokeObjectURL(oldUrl);
  const idx = videoUsageOrder.indexOf(id);
  if (idx !== -1) videoUsageOrder.splice(idx, 1);
  activeVideoObjectUrls.set(id, url);
  videoUsageOrder.push(id);
  trimVideoCache();
}

export function pinVideoObjectURL(id: string) {
  pinnedVideoObjectUrls.add(id);
  const idx = videoUsageOrder.indexOf(id);
  if (idx !== -1) {
    videoUsageOrder.splice(idx, 1);
    videoUsageOrder.push(id);
  }
}

export function unpinVideoObjectURL(id: string) {
  pinnedVideoObjectUrls.delete(id);
  trimVideoCache();
}
