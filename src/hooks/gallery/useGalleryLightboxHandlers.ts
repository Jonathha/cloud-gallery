import { DecryptedImage } from "../../types";
import { UseGalleryLightboxProps } from "./types";
import { closeLightboxHelper, toggleFullscreenHelper } from "./lightbox/lightboxOpenClose";
import { handleItemClickHelper } from "./lightbox/lightboxItemClick";
import { useRef, useEffect, useCallback } from "react";

interface HandlersProps extends UseGalleryLightboxProps {
  setShowControls: (val: boolean) => void;
  setIsZoomed: (val: boolean) => void;
  setIsPromptingExtra: (val: string | null) => void;
}

export function useGalleryLightboxHandlers(props: HandlersProps) {
  const latestPropsRef = useRef(props);
  useEffect(() => {
    latestPropsRef.current = props;
  });

  const closeLightbox = useCallback(() => {
    const p = latestPropsRef.current;
    closeLightboxHelper(p.setIsZoomed, p.setSelectedImage, p.setSelectedImageId, p.setShowControls);
  }, []);

  const handleImageClick = useCallback((img: DecryptedImage, index: number, e: React.MouseEvent) => {
    handleItemClickHelper(img, index, e, latestPropsRef.current);
  }, []);

  const toggleFullscreen = useCallback(() => {
    toggleFullscreenHelper();
  }, []);

  return { closeLightbox, handleImageClick, toggleFullscreen };
}
