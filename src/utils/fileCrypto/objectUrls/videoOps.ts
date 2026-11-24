import { activeVideoObjectUrls, videoUsageOrder, pinnedVideoObjectUrls } from "./videoState";
import { notifyObjectUrlRevoked } from "./objectUrlEvents";

export function getVideoObjectURL(id: string): string | undefined {
  const url = activeVideoObjectUrls.get(id);
  if (url) {
    const idx = videoUsageOrder.indexOf(id);
    if (idx !== -1) videoUsageOrder.splice(idx, 1);
    videoUsageOrder.push(id);
  }
  return url;
}

export function revokeVideoObjectURL(id: string) {
  const url = activeVideoObjectUrls.get(id);
  if (url) {
    try { URL.revokeObjectURL(url); } catch (e) {}
    activeVideoObjectUrls.delete(id);
    notifyObjectUrlRevoked(id);
  }
  pinnedVideoObjectUrls.delete(id);
  const idx = videoUsageOrder.indexOf(id);
  if (idx !== -1) videoUsageOrder.splice(idx, 1);
}

export function clearVideoObjectURLs() {
  for (const [id, url] of activeVideoObjectUrls.entries()) {
    try { URL.revokeObjectURL(url); } catch (e) {}
    notifyObjectUrlRevoked(id);
  }
  activeVideoObjectUrls.clear();
  videoUsageOrder.length = 0;
  pinnedVideoObjectUrls.clear();
}
