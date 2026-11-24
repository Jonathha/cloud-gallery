import { DecryptedImage } from "../../../types";
import { getVideoObjectURL, getImageObjectURL } from "../../../utils/fileCrypto";

export function getPreloadTargets(images: DecryptedImage[], selectedImageId: string | null) {
  if (!selectedImageId || images.length === 0) return { immediate: [], secondary: [] };
  const idx = images.findIndex((img) => img.id === selectedImageId);
  if (idx === -1) return { immediate: [], secondary: [] };

  const isReady = (img: DecryptedImage) => Boolean(img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id));
  const immediate = [idx + 1, idx - 1].map((i) => images[i]).filter((img) => img && !img.failed && !isReady(img));
  const secondary = [idx + 2, idx - 2].map((i) => images[i]).filter((img) => img && !img.failed && !isReady(img));
  return { immediate, secondary };
}
