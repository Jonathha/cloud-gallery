import { useState, useEffect } from "react";
import { notifyAppSystemUI } from "../../utils/appBridge";

export function useProtectedLightbox(
  images: any[],
  onLightboxToggle?: (isOpen: boolean) => void
) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imageFit, setImageFit] = useState<"contain" | "cover">("contain");
  const [showControls, setShowControls] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    onLightboxToggle?.(selectedIndex !== null);
  }, [selectedIndex, onLightboxToggle]);

  useEffect(() => {
    if (selectedIndex !== null) {
      notifyAppSystemUI(showControls);
    } else {
      notifyAppSystemUI(true);
    }
  }, [selectedIndex, showControls]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Erro ao tentar alternar tela cheia:", err);
    }
  };

  const handleImageClick = async (img: any, index: number) => {
    if (img.failed) return;
    setSelectedIndex(index);
    if (selectedIndex === null) {
      setShowControls(true);
    }
  };

  const closeLightbox = () => {
    setSelectedIndex(null);
    setShowControls(true);
    notifyAppSystemUI(true);
  };

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setIsZoomed(false);
    setSelectedIndex(
      selectedIndex === 0 ? images.length - 1 : selectedIndex - 1
    );
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setIsZoomed(false);
    setSelectedIndex(
      selectedIndex === images.length - 1 ? 0 : selectedIndex + 1
    );
  };

  return {
    selectedIndex,
    setSelectedIndex,
    imageFit,
    setImageFit,
    showControls,
    setShowControls,
    isZoomed,
    setIsZoomed,
    isFullscreen,
    setIsFullscreen,
    isShareOpen,
    setIsShareOpen,
    closeLightbox,
    toggleFullscreen,
    handleImageClick,
    handlePrev,
    handleNext,
  };
}
