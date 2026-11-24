import { activeVideoObjectUrls } from "./objectUrls/videoState";
import { activeImageObjectUrls } from "./objectUrls/imageState";

export * from "./objectUrls/objectUrlEvents";
export * from "./objectUrls/videoState";
export * from "./objectUrls/videoUrls";
export * from "./objectUrls/videoOps";
export * from "./objectUrls/imageState";
export * from "./objectUrls/imageUrls";
export * from "./objectUrls/imageOps";

export function isOriginalMediaReady(id: string, isVideo = false): boolean {
  if (isVideo) return activeVideoObjectUrls.has(id);
  return activeImageObjectUrls.has(id);
}
