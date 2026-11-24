import { notifyObjectUrlRevoked } from "./objectUrlEvents";

export const activeImageObjectUrls = new Map<string, string>();
export const imageUsageOrder: string[] = [];
export const pinnedImageObjectUrls = new Set<string>();
export const MAX_ACTIVE_IMAGE_OBJECT_URLS = 75;

export function trimImageCache() {
  while (imageUsageOrder.length > MAX_ACTIVE_IMAGE_OBJECT_URLS) {
    const oldestIndex = imageUsageOrder.findIndex((id) => !pinnedImageObjectUrls.has(id));
    if (oldestIndex === -1) return;
    const [oldestId] = imageUsageOrder.splice(oldestIndex, 1);
    const oldestUrl = activeImageObjectUrls.get(oldestId);
    if (oldestUrl) {
      try { URL.revokeObjectURL(oldestUrl); } catch (e) {}
      activeImageObjectUrls.delete(oldestId);
      notifyObjectUrlRevoked(oldestId);
    }
  }
}
