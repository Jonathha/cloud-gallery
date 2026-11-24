import { activeImageObjectUrls, imageUsageOrder, pinnedImageObjectUrls } from "./imageState";
import { notifyObjectUrlRevoked } from "./objectUrlEvents";

export function revokeImageObjectURL(id: string) {
  const url = activeImageObjectUrls.get(id);
  if (url) {
    try { URL.revokeObjectURL(url); } catch (e) {}
    activeImageObjectUrls.delete(id);
    notifyObjectUrlRevoked(id);
  }
  pinnedImageObjectUrls.delete(id);
  const idx = imageUsageOrder.indexOf(id);
  if (idx !== -1) imageUsageOrder.splice(idx, 1);
}

export function getImageObjectURL(id: string): string | undefined {
  const url = activeImageObjectUrls.get(id);
  if (url) {
    const idx = imageUsageOrder.indexOf(id);
    if (idx !== -1) imageUsageOrder.splice(idx, 1);
    imageUsageOrder.push(id);
  }
  return url;
}

export function clearImageObjectURLs() {
  for (const [id, url] of activeImageObjectUrls.entries()) {
    try { URL.revokeObjectURL(url); } catch (e) {}
    notifyObjectUrlRevoked(id);
  }
  activeImageObjectUrls.clear();
  imageUsageOrder.length = 0;
  pinnedImageObjectUrls.clear();
}
