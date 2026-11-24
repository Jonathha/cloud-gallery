import { notifyObjectUrlRevoked } from "./objectUrlEvents";

export const activeVideoObjectUrls = new Map<string, string>();
export const videoUsageOrder: string[] = [];
export const pinnedVideoObjectUrls = new Set<string>();
export const MAX_ACTIVE_VIDEO_OBJECT_URLS = 24;

export function trimVideoCache() {
  while (videoUsageOrder.length > MAX_ACTIVE_VIDEO_OBJECT_URLS) {
    const oldestIndex = videoUsageOrder.findIndex((id) => !pinnedVideoObjectUrls.has(id));
    if (oldestIndex === -1) return;
    const [oldestId] = videoUsageOrder.splice(oldestIndex, 1);
    const oldestUrl = activeVideoObjectUrls.get(oldestId);
    if (oldestUrl) {
      try { URL.revokeObjectURL(oldestUrl); } catch (e) {}
      activeVideoObjectUrls.delete(oldestId);
      notifyObjectUrlRevoked(oldestId);
    }
  }
}
