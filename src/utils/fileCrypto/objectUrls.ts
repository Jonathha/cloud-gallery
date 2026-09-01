const activeVideoObjectUrls = new Map<string, string>();
const videoUsageOrder: string[] = [];

export function registerVideoObjectURL(id: string, url: string) {
  const oldUrl = activeVideoObjectUrls.get(id);
  if (oldUrl && oldUrl !== url) {
    URL.revokeObjectURL(oldUrl);
  }

  const idx = videoUsageOrder.indexOf(id);
  if (idx !== -1) {
    videoUsageOrder.splice(idx, 1);
  }
  
  activeVideoObjectUrls.set(id, url);
  videoUsageOrder.push(id);
  
  if (videoUsageOrder.length > 3) {
    const oldestId = videoUsageOrder.shift();
    if (oldestId) {
      const oldestUrl = activeVideoObjectUrls.get(oldestId);
      if (oldestUrl) {
        URL.revokeObjectURL(oldestUrl);
        activeVideoObjectUrls.delete(oldestId);
        console.log(`[Video Cache] Revoked oldest video ObjectURL for ID: ${oldestId}`);
      }
    }
  }
}

export function getVideoObjectURL(id: string): string | undefined {
  const url = activeVideoObjectUrls.get(id);
  if (url) {
    const idx = videoUsageOrder.indexOf(id);
    if (idx !== -1) {
      videoUsageOrder.splice(idx, 1);
    }
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
}

const activeImageObjectUrls = new Map<string, string>();
const imageUsageOrder: string[] = [];
const MAX_ACTIVE_IMAGE_OBJECT_URLS = 25;

export function registerImageObjectURL(id: string, url: string) {
  if (!url || !url.startsWith("blob:")) return;

  const oldUrl = activeImageObjectUrls.get(id);
  if (oldUrl && oldUrl !== url) {
    try {
      URL.revokeObjectURL(oldUrl);
    } catch (e) {}
  }

  const idx = imageUsageOrder.indexOf(id);
  if (idx !== -1) {
    imageUsageOrder.splice(idx, 1);
  }

  activeImageObjectUrls.set(id, url);
  imageUsageOrder.push(id);

  while (imageUsageOrder.length > MAX_ACTIVE_IMAGE_OBJECT_URLS) {
    const oldestId = imageUsageOrder.shift();
    if (oldestId) {
      const oldestUrl = activeImageObjectUrls.get(oldestId);
      if (oldestUrl) {
        try {
          URL.revokeObjectURL(oldestUrl);
        } catch (e) {}
        activeImageObjectUrls.delete(oldestId);
      }
    }
  }
}

export function revokeImageObjectURL(id: string) {
  const url = activeImageObjectUrls.get(id);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
    activeImageObjectUrls.delete(id);
  }
  const idx = imageUsageOrder.indexOf(id);
  if (idx !== -1) {
    imageUsageOrder.splice(idx, 1);
  }
}

export function revokeVideoObjectURL(id: string) {
  const url = activeVideoObjectUrls.get(id);
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {}
    activeVideoObjectUrls.delete(id);
  }
  const idx = videoUsageOrder.indexOf(id);
  if (idx !== -1) {
    videoUsageOrder.splice(idx, 1);
  }
}

export function isOriginalMediaReady(id: string, isVideo = false): boolean {
  if (isVideo) {
    return activeVideoObjectUrls.has(id);
  }
  return activeImageObjectUrls.has(id);
}

export function getImageObjectURL(id: string): string | undefined {
  const url = activeImageObjectUrls.get(id);
  if (url) {
    const idx = imageUsageOrder.indexOf(id);
    if (idx !== -1) {
      imageUsageOrder.splice(idx, 1);
    }
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
}
