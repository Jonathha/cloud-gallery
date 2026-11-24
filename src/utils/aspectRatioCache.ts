const STORAGE_KEY = "cloud_gallery_aspect_ratios_v1";
const DIMENSIONS_STORAGE_KEY = "cloud_gallery_media_dimensions_v1";

export interface MediaDimensions {
  width: number;
  height: number;
  duration?: number;
}

export const aspectRatioCache = new Map<string, number>();
export const mediaDimensionsCache = new Map<string, MediaDimensions>();

let isInitialized = false;

export function initializeAspectRatioCache() {
  if (isInitialized) return;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        for (const [k, v] of parsed) {
          if (k && typeof v === "number" && !isNaN(v)) {
            aspectRatioCache.set(k, v);
          }
        }
      }
    }
    const savedDims = localStorage.getItem(DIMENSIONS_STORAGE_KEY);
    if (savedDims) {
      const parsedDims = JSON.parse(savedDims);
      if (Array.isArray(parsedDims)) {
        for (const [k, v] of parsedDims) {
          if (k && v && typeof v.width === "number" && typeof v.height === "number" && v.width > 0 && v.height > 0) {
            mediaDimensionsCache.set(k, v);
            if (!aspectRatioCache.has(k)) {
              aspectRatioCache.set(k, v.width / v.height);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Failed to load aspect ratios from localStorage", e);
  } finally {
    isInitialized = true;
  }
}

// Run immediately upon import
initializeAspectRatioCache();

export function getCachedAspectRatio(id: string): number | undefined {
  return aspectRatioCache.get(id);
}

export function getCachedMediaDimensions(id: string): MediaDimensions | undefined {
  return mediaDimensionsCache.get(id);
}

let saveTimeout: any = null;
let saveDimsTimeout: any = null;

export function saveAspectRatio(id: string, ratio: number) {
  if (!id || !ratio || isNaN(ratio)) return;
  
  const existing = aspectRatioCache.get(id);
  if (existing !== undefined && Math.abs(existing - ratio) < 0.001) {
    return;
  }
  
  aspectRatioCache.set(id, ratio);
  
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(aspectRatioCache.entries())));
    } catch (e) {
      console.error("Failed to save aspect ratios to localStorage", e);
    }
    saveTimeout = null;
  }, 1000);
}

export function saveMediaDimensions(id: string, width: number, height: number, duration?: number) {
  if (!id || !width || !height || width <= 0 || height <= 0 || isNaN(width) || isNaN(height)) return;

  saveAspectRatio(id, width / height);

  const existing = mediaDimensionsCache.get(id);
  const cleanDuration = duration && !isNaN(duration) && duration > 0 ? duration : existing?.duration;
  if (
    existing &&
    existing.width === width &&
    existing.height === height &&
    existing.duration === cleanDuration
  ) {
    return;
  }

  mediaDimensionsCache.set(id, {
    width: Math.round(width),
    height: Math.round(height),
    ...(cleanDuration ? { duration: cleanDuration } : {}),
  });

  if (saveDimsTimeout) {
    clearTimeout(saveDimsTimeout);
  }

  saveDimsTimeout = setTimeout(() => {
    try {
      localStorage.setItem(DIMENSIONS_STORAGE_KEY, JSON.stringify(Array.from(mediaDimensionsCache.entries())));
    } catch (e) {
      console.error("Failed to save media dimensions to localStorage", e);
    }
    saveDimsTimeout = null;
  }, 1000);
}
