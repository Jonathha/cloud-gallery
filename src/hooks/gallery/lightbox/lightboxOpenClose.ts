import { notifyAppSystemUI } from "../../../utils/appBridge";

let isClosing = false;

export async function closeLightboxHelper(
  setIsZoomed: (v: boolean) => void,
  setSelectedImage: (v: string | null) => void,
  setSelectedImageId: (v: string | null) => void,
  setShowControls: (v: boolean) => void
) {
  if (isClosing) return;
  isClosing = true;

  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch {}
    }
    document.documentElement.classList.remove('lightbox-open');
    document.body.classList.remove('lightbox-open');
    notifyAppSystemUI(true);
    setIsZoomed(false); setSelectedImage(null); setSelectedImageId(null); setShowControls(true);
    if (window.history.state?.isLightbox) {
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      if (url.searchParams.has("image")) {
        url.searchParams.delete("image");
        window.history.replaceState({}, "", url);
      }
    }
  } finally {
    setTimeout(() => {
      isClosing = false;
    }, 150);
  }
}

export async function toggleFullscreenHelper() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) await document.exitFullscreen();
  } catch {}
}
