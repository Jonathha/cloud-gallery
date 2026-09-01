const activeVideoObjectUrls = new Map<string, string>();
const videoUsageOrder: string[] = [];
const pinnedVideoObjectUrls = new Set<string>();

function trimVideoCache() {
  while (videoUsageOrder.length > 3) {
    const oldestIndex = videoUsageOrder.findIndex((id) => !pinnedVideoObjectUrls.has(id));
    if (oldestIndex === -1) return;
    const [oldestId] = videoUsageOrder.splice(oldestIndex, 1);
    const oldestUrl = activeVideoObjectUrls.get(oldestId);
    if (oldestUrl) {
      URL.revokeObjectURL(oldestUrl);
      activeVideoObjectUrls.delete(oldestId);
    }
  }
}

export function registerVideoObjectURL(id: string, url: string) {
  const oldUrl = activeVideoObjectUrls.get(id);
  if (oldUrl && oldUrl !== url) {
    URL.revokeObjectURL(oldUrl);
  }

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

export function getVideoObjectURL(id: string): string | undefined {
  const url = activeVideoObjectUrls.get(id);
  if (url) {
    const idx = videoUsageOrder.indexOf(id);
    if (idx !== -1) videoUsageOrder.splice(idx, 1);
    videoUsageOrder.push(id);
  }
  return url;
}

export function clearVideoObjectURLs() {
  for (const url of activeVideoObjectUrls.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Failed to revoke video ObjectURL on lock/logout:", e);
    }
  }
  activeVideoObjectUrls.clear();
  videoUsageOrder.length = 0;
  pinnedVideoObjectUrls.clear();
}

const activeImageObjectUrls = new Map<string, string>();
const imageUsageOrder: string[] = [];
const pinnedImageObjectUrls = new Set<string>();
const MAX_ACTIVE_IMAGE_OBJECT_URLS = 25;

function trimImageCache() {
  while (imageUsageOrder.length > MAX_ACTIVE_IMAGE_OBJECT_URLS) {
    const oldestIndex = imageUsageOrder.findIndex((id) => !pinnedImageObjectUrls.has(id));
    if (oldestIndex === -1) return;
    const [oldestId] = imageUsageOrder.splice(oldestIndex, 1);
    const oldestUrl = activeImageObjectUrls.get(oldestId);
    if (oldestUrl) {
      try {
        URL.revokeObjectURL(oldestUrl);
      } catch (e) {}
      activeImageObjectUrls.delete(oldestId);
    }
  }
}

export function registerImageObjectURL(id: string, url: string) {
  if (!url || !url.startsWith("blob:")) return;

  const oldUrl = activeImageObjectUrls.get(id);
  if (oldUrl && oldUrl !== url) {
    try {
      URL.revokeObjectURL(oldUrl);
    } catch (e) {}
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

export function revokeImageObjectURL(id: string) {
  const url = activeImageObjectUrls.get(id);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
    activeImageObjectUrls.delete(id);
  }
  pinnedImageObjectUrls.delete(id);
  const idx = imageUsageOrder.indexOf(id);
  if (idx !== -1) imageUsageOrder.splice(idx, 1);
}

export function revokeVideoObjectURL(id: string) {
  const url = activeVideoObjectUrls.get(id);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
    activeVideoObjectUrls.delete(id);
  }
  pinnedVideoObjectUrls.delete(id);
  const idx = videoUsageOrder.indexOf(id);
  if (idx !== -1) videoUsageOrder.splice(idx, 1);
}

export function isOriginalMediaReady(id: string, isVideo = false): boolean {
  if (isVideo) return activeVideoObjectUrls.has(id);
  return activeImageObjectUrls.has(id);
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
  for (const url of activeImageObjectUrls.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Failed to revoke image ObjectURL on lock/logout:", e);
    }
  }
  activeImageObjectUrls.clear();
  imageUsageOrder.length = 0;
  pinnedImageObjectUrls.clear();
}
