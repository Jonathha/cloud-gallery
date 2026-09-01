import { DecryptedImage } from "../../types";
import { notifyAppSystemUI } from "../../utils/appBridge";
import { getVideoObjectURL, getImageObjectURL } from "../../utils/fileCrypto";
import { UseGalleryLightboxProps } from "./types";

interface HandlersProps extends UseGalleryLightboxProps {
  setShowControls: (val: boolean) => void;
  setIsZoomed: (val: boolean) => void;
  setIsPromptingExtra: (val: string | null) => void;
}

export function useGalleryLightboxHandlers(props: HandlersProps) {
  const closeLightbox = async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (err) {}
    }
    notifyAppSystemUI(true);
    props.setIsZoomed(false);
    props.setSelectedImage(null);
    props.setSelectedImageId(null);
    props.setShowControls(true);

    const url = new URL(window.location.href);
    url.searchParams.delete("image");
    window.history.replaceState({}, "", url);
  };

  const handleImageClick = async (img: DecryptedImage, index: number, e: React.MouseEvent) => {
    if (props.isSelectionMode) {
      props.handleSelectionClick(img, index, e);
      return;
    }
    if (img.failed) return;
    if (img.id === props.securityImageId && !props.isExtraUnlocked && props.extraPassword) {
      props.setIsPromptingExtra(img.id);
      return;
    }
    const isVideo = img.isVideo || img.contentType?.startsWith("video/") || false;
    props.setSelectedImageIsVideo(isVideo);
    
    const isInitialOpen = !props.selectedImageId;
    if (isInitialOpen) props.setShowControls(true);

    const url = new URL(window.location.href);
    url.searchParams.set("image", img.id);
    window.history.replaceState({}, "", url);

    const cachedObjectURL = isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
    if (!cachedObjectURL) img.originalUrl = undefined;
    props.setSelectedImage(cachedObjectURL || img.originalUrl || img.url || null);
    
    props.setSelectedImageId(img.id);
    await props.fetchFullMedia(img);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {}
  };

  return { closeLightbox, handleImageClick, toggleFullscreen };
}
