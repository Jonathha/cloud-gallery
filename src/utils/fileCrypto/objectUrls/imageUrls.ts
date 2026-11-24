import { activeImageObjectUrls, imageUsageOrder, pinnedImageObjectUrls, trimImageCache } from "./imageState";

export function registerImageObjectURL(id: string, url: string) {
  if (!url || !url.startsWith("blob:")) return;
  const oldUrl = activeImageObjectUrls.get(id);
  if (oldUrl && oldUrl !== url) {
    try { URL.revokeObjectURL(oldUrl); } catch (e) {}
  }
  const idx = imageUsageOrder.indexOf(id);
  if (idx !== -1) imageUsageOrder.splice(idx, 1);
  activeImageObjectUrls.set(id, url);
  imageUsageOrder.push(id);
  trimImageCache();
}

export function pinImageObjectURL(id: string) {
  pinnedImageObjectUrls.add(id);
  const idx = imageUsageOrder.indexOf(id);
  if (idx !== -1) {
    imageUsageOrder.splice(idx, 1);
    imageUsageOrder.push(id);
  }
}

export function unpinImageObjectURL(id: string) {
  pinnedImageObjectUrls.delete(id);
  trimImageCache();
}
