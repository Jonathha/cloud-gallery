import { DecryptedImage } from "../../types";
import { getImageObjectURL, getVideoObjectURL } from "../../utils/fileCrypto";

export function checkExistingObjectURL(
  img: DecryptedImage,
  isVideo: boolean,
  isPreload: boolean,
  setSelectedImage: (url: string | null) => void
): boolean {
  if (isVideo) {
    const cachedUrl = getVideoObjectURL(img.id);
    if (cachedUrl) {
      img.originalUrl = cachedUrl;
      if (!isPreload) setSelectedImage(cachedUrl);
      return true;
    } else {
      img.originalUrl = undefined;
    }
  } else {
    const cachedUrl = getImageObjectURL(img.id);
    if (cachedUrl) {
      img.originalUrl = cachedUrl;
      if (!isPreload) setSelectedImage(cachedUrl);
      return true;
    } else {
      img.originalUrl = undefined;
    }
  }
  return false;
}
