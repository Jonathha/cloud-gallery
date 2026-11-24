import { useEffect } from "react";
import { DecryptedImage } from "../../types";
import { getPreloadTargets } from "./preload/preloadTargets";
import { executePreload } from "./preload/preloadRunner";

interface UseGalleryPreloadProps {
  images: DecryptedImage[]; selectedImageId: string | null;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>;
}

export function useGalleryPreload({ images, selectedImageId, fetchFullMedia }: UseGalleryPreloadProps) {
  useEffect(() => {
    const { immediate, secondary } = getPreloadTargets(images, selectedImageId);
    if (immediate.length === 0 && secondary.length === 0) return;
    return executePreload(immediate, secondary, fetchFullMedia);
  }, [selectedImageId, images, fetchFullMedia]);
}
