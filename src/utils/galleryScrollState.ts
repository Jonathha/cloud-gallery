let isScrolling = false;
let lastScrollAt = 0;
let scrollTimeout: any = null;
const SCROLL_STOP_DELAY = 250;
const scrollStopListeners = new Set<() => void>();

// Um único timer reagendado só quando expira, em vez de clearTimeout/setTimeout a cada evento de scroll.
// O comportamento é o mesmo: o fim do scroll é sinalizado 250ms após o último evento.
function checkScrollStop() {
  const remaining = SCROLL_STOP_DELAY - (Date.now() - lastScrollAt);
  if (remaining > 0) {
    scrollTimeout = setTimeout(checkScrollStop, remaining);
    return;
  }
  scrollTimeout = null;
  isScrolling = false;
  scrollStopListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {}
  });
}

if (typeof window !== "undefined") {
  window.addEventListener(
    "scroll",
    () => {
      isScrolling = true;
      lastScrollAt = Date.now();
      if (!scrollTimeout) scrollTimeout = setTimeout(checkScrollStop, SCROLL_STOP_DELAY);
    },
    { capture: true, passive: true }
  );
}

export function isGalleryScrolling(): boolean {
  return isScrolling;
}

export function onGalleryScrollStop(callback: () => void): () => void {
  scrollStopListeners.add(callback);
  return () => {
    scrollStopListeners.delete(callback);
  };
}
