import { useState, useEffect } from "react";
import { notifyAppSystemUI } from "../../utils/appBridge";
import { useGalleryLightboxSecurity } from "./useGalleryLightboxSecurity";
import { UseGalleryLightboxProps } from "./types";

export function useGalleryLightboxState(props: UseGalleryLightboxProps) {
  const [imageFit, setImageFit] = useState<"contain" | "cover">("contain");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const security = useGalleryLightboxSecurity({
    images: props.images,
    extraPassword: props.extraPassword,
    resetFailedAttempts: props.resetFailedAttempts,
    registerFailedAttempt: props.registerFailedAttempt,
    lockVault: props.lockVault,
    showToast: props.showToast,
    setIsExtraUnlocked: props.setIsExtraUnlocked,
    setSelectedImage: props.setSelectedImage,
    setSelectedImageId: props.setSelectedImageId,
    setShowControls,
  });

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    notifyAppSystemUI(props.selectedImageId ? showControls : true);
  }, [props.selectedImageId, showControls]);

  return {
    imageFit, setImageFit,
    showControls, setShowControls,
    isFullscreen, setIsFullscreen,
    isZoomed, setIsZoomed,
    isShareOpen, setIsShareOpen,
    ...security,
  };
}
