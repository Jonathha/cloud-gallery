import { useEffect } from "react";
import { DecryptedImage } from "../../types";
import { getVideoObjectURL, getImageObjectURL } from "../../utils/fileCrypto";

interface UseGalleryPreloadProps {
  images: DecryptedImage[];
  selectedImageId: string | null;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>;
}

export function useGalleryPreload({
  images,
  selectedImageId,
  fetchFullMedia,
}: UseGalleryPreloadProps) {
  useEffect(() => {
    if (!selectedImageId || images.length === 0) return;

    const currentIndex = images.findIndex((img) => img.id === selectedImageId);
    if (currentIndex === -1) return;

    const isMediaReady = (img: DecryptedImage) =>
      Boolean(img.originalUrl) ||
      Boolean(img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id));

    // High priority: immediate neighbors
    const immediateTargets = [currentIndex + 1, currentIndex - 1]
      .map((idx) => images[idx])
      .filter((img) => img && !img.failed && !isMediaReady(img));

    // Secondary priority: neighbors +/- 2
    const secondaryTargets = [currentIndex + 2, currentIndex - 2]
      .map((idx) => images[idx])
      .filter((img) => img && !img.failed && !isMediaReady(img));

    let active = true;
    let secondaryTimer: ReturnType<typeof setTimeout> | null = null;

    const runPreload = async () => {
      // 1. Process immediate neighbors (+1 and -1)
      for (const img of immediateTargets) {
        if (!active) break;
        try {
          await fetchFullMedia(img, true);
        } catch (e) {
          console.warn(`Failed to preload adjacent media ${img.id}`, e);
        }
      }

      // 2. Process secondary targets (+2 and -2) with slight delay
      if (active && secondaryTargets.length > 0) {
        secondaryTimer = setTimeout(async () => {
          for (const img of secondaryTargets) {
            if (!active) break;
            try {
              await fetchFullMedia(img, true);
            } catch (e) {
              console.warn(`Failed to preload secondary media ${img.id}`, e);
            }
          }
        }, 150);
      }
    };

    runPreload();

    return () => {
      active = false;
      if (secondaryTimer) clearTimeout(secondaryTimer);
    };
  }, [selectedImageId, images, fetchFullMedia]);
}
