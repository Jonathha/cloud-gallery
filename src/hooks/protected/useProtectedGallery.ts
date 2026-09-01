import { useState, useEffect } from "react";
import { useProtectedUnlock } from "./useProtectedUnlock";
import { useProtectedImages } from "./useProtectedImages";
import { useProtectedLightbox } from "./useProtectedLightbox";
import { useProtectedDeletion } from "./useProtectedDeletion";

export function useProtectedGallery(onLightboxToggle?: (isOpen: boolean) => void) {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const unlock = useProtectedUnlock();
  const imgs = useProtectedImages(unlock.isUnlocked);
  const lightbox = useProtectedLightbox(imgs.images, onLightboxToggle);
  const deletion = useProtectedDeletion({
    images: imgs.images,
    setImages: imgs.setImages,
    selectedIndex: lightbox.selectedIndex,
    setSelectedIndex: lightbox.setSelectedIndex,
    loadProtectedImages: imgs.loadProtectedImages,
    setToast,
  });

  useEffect(() => {
    if (lightbox.selectedIndex === null) return;
    const img = imgs.images[lightbox.selectedIndex];
    if (img && !img.originalUrl && !imgs.decryptedFullCache.current.has(img.id)) {
      imgs.fetchFullResolution(img);
    }
  }, [lightbox.selectedIndex]);

  return {
    ...unlock,
    ...imgs,
    ...lightbox,
    ...deletion,
    toast,
    setToast,
  };
}
