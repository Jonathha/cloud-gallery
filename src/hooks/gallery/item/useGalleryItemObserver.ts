import { useRef, useState, useEffect } from "react";
import { DecryptedImage } from "../../../types";
import {
  getImageObjectURL,
  getVideoObjectURL,
  pinImageObjectURL,
  pinVideoObjectURL,
  unpinImageObjectURL,
  unpinVideoObjectURL,
  onObjectUrlRevoked,
} from "../../../utils/fileCrypto";
import { aspectRatioCache, saveAspectRatio } from "../../../utils/aspectRatioCache";
import { cancelQueuedMediaLoad } from "../../../utils/mediaScheduler";
import { isGalleryScrolling, onGalleryScrollStop } from "../../../utils/galleryScrollState";

interface UseGalleryItemObserverProps {
  img: DecryptedImage;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean, priority?: number) => Promise<void>;
}

function getActiveMediaUrl(targetImg: DecryptedImage): string | null {
  const active = targetImg.isVideo ? getVideoObjectURL(targetImg.id) : getImageObjectURL(targetImg.id);
  if (active) {
    targetImg.originalUrl = active;
    return active;
  }
  if (targetImg.originalUrl) {
    targetImg.originalUrl = undefined;
  }
  return null;
}

export function useGalleryItemObserver({ img, fetchFullMedia }: UseGalleryItemObserverProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);
  const isPreloadIntersectingRef = useRef(false);
  const mediaLoadRef = useRef<Promise<void> | null>(null);
  const latestImgRef = useRef(img);
  latestImgRef.current = img;
  // Altura real (px) da miniatura já descriptografada; resolve 0 se desconhecida
  const thumbHeightRef = useRef<Promise<number>>(Promise.resolve(0));

  const [displayUrl, setDisplayUrl] = useState<string>(() => {
    return getActiveMediaUrl(img) || img.url;
  });
  const [fullMediaUrl, setFullMediaUrl] = useState<string | null>(() => {
    return getActiveMediaUrl(img);
  });
  const [isVisible, setIsVisible] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(() => {
    const cached = aspectRatioCache.get(img.id);
    return cached !== undefined ? cached : 1;
  });

  // Listen to global Object URL revocation to immediately clear references and prevent 404/gray flashes
  useEffect(() => {
    const unsubscribe = onObjectUrlRevoked((revokedId) => {
      if (revokedId === latestImgRef.current.id) {
        latestImgRef.current.originalUrl = undefined;
        setFullMediaUrl(null);
        setDisplayUrl(latestImgRef.current.url);
      }
    });
    return unsubscribe;
  }, [img.id]);

  useEffect(() => {
    const active = getActiveMediaUrl(img);
    if (active) {
      setFullMediaUrl(active);
      setDisplayUrl(active);
    } else {
      setFullMediaUrl(null);
      setDisplayUrl(img.url);
    }

    const cached = aspectRatioCache.get(img.id);
    if (cached !== undefined && cached > 0.05 && cached < 20) {
      setAspectRatio((prev) => (Math.abs(prev - cached) < 0.001 ? prev : cached));
    }

    if (img.url) {
      const im = new Image();
      im.src = img.url;
      if (im.complete && im.naturalWidth && im.naturalHeight) {
        const ratio = im.naturalWidth / im.naturalHeight;
        saveAspectRatio(img.id, ratio);
        setAspectRatio((prev) => (Math.abs(prev - ratio) < 0.001 ? prev : ratio));
        thumbHeightRef.current = Promise.resolve(im.naturalHeight);
      } else {
        let resolveThumbHeight: (h: number) => void = () => {};
        thumbHeightRef.current = new Promise<number>((resolve) => { resolveThumbHeight = resolve; });
        im.onload = () => {
          if (im.naturalWidth && im.naturalHeight) {
            const ratio = im.naturalWidth / im.naturalHeight;
            saveAspectRatio(img.id, ratio);
            setAspectRatio((prev) => (Math.abs(prev - ratio) < 0.001 ? prev : ratio));
          }
          resolveThumbHeight(im.naturalHeight || 0);
        };
        im.onerror = () => resolveThumbHeight(0);
      }
    } else {
      thumbHeightRef.current = Promise.resolve(0);
    }
  }, [img.url, img.id, img.isVideo]);

  useEffect(() => {
    let isMounted = true;

    // Na grade, o original (ex.: 12 MP) só é baixado/decodificado se a miniatura não tiver pixels
    // suficientes para a altura exibida do quadrado. Vídeos e miniaturas desconhecidas mantêm o fluxo atual.
    const gridNeedsOriginal = async () => {
      const currentImg = latestImgRef.current;
      if (currentImg.isVideo) return true;
      const thumbHeight = await thumbHeightRef.current;
      const el = itemRef.current;
      if (!thumbHeight || !el) return true;
      const tileHeight = el.getBoundingClientRect().height * (window.devicePixelRatio || 1);
      return thumbHeight < tileHeight;
    };

    const ensureMediaLoaded = async (priority: number) => {
      const currentImg = latestImgRef.current;
      if (getActiveMediaUrl(currentImg)) {
        return;
      }
      if (!(await gridNeedsOriginal())) return;
      if (!isMounted || (!isVisibleRef.current && !isPreloadIntersectingRef.current)) return;
      mediaLoadRef.current = fetchFullMedia(currentImg, true, priority).finally(() => {
        mediaLoadRef.current = null;
      });
      return mediaLoadRef.current;
    };

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries[0].isIntersecting;
        isPreloadIntersectingRef.current = isIntersecting;

        if (!isIntersecting) {
          // If the item has left the preload zone, cancel queued load to prevent obsolete work
          const currentImg = latestImgRef.current;
          cancelQueuedMediaLoad(currentImg.id);

          // If far outside and not visible, clean up fullMediaUrl if evicted from cache
          if (!isVisibleRef.current) {
            const active = getActiveMediaUrl(currentImg);
            if (!active) {
              setFullMediaUrl(null);
              setDisplayUrl(currentImg.url);
            }
          }
          return;
        }

        // During active scroll, DO NOT aggressively preload full originals
        if (isGalleryScrolling()) {
          return;
        }

        // Conservative preload: decrypt into memory object cache with LOW priority (1)
        // Notice: do NOT call setFullMediaUrl while off-screen to avoid forcing heavy GPU texture decoding!
        if (!isVisibleRef.current) {
          ensureMediaLoaded(1).catch(() => {});
        }
      },
      { rootMargin: "250px 0px 250px 0px" }
    );

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting;
        isVisibleRef.current = visible;
        setIsVisible(visible);

        const currentImg = latestImgRef.current;
        if (!visible) {
          // Cancel queued preload if it hasn't started yet because the item has left viewport
          cancelQueuedMediaLoad(currentImg.id);
          
          // Unpin when leaving viewport so cache eviction can reclaim memory naturally
          if (currentImg.isVideo) {
            unpinVideoObjectURL(currentImg.id);
          } else {
            unpinImageObjectURL(currentImg.id);
          }
          return;
        }

        // When entering visible viewport, check if full original is already in active Object URL cache
        const active = getActiveMediaUrl(currentImg);
        if (active) {
          if (currentImg.isVideo) {
            pinVideoObjectURL(currentImg.id);
          } else {
            pinImageObjectURL(currentImg.id);
          }
          setFullMediaUrl(active);
          setDisplayUrl(active);
          return;
        }

        // Cache miss: display crisp thumbnail as fallback and prepare full-res original with high priority
        setFullMediaUrl(null);
        setDisplayUrl(currentImg.url);

        if (isGalleryScrolling()) {
          return;
        }

        ensureMediaLoaded(2)
          .then(() => {
            if (!isMounted) return;
            const innerImg = latestImgRef.current;
            if (isVisibleRef.current) {
              const loadedUrl = getActiveMediaUrl(innerImg);
              if (loadedUrl) {
                if (innerImg.isVideo) {
                  pinVideoObjectURL(innerImg.id);
                } else {
                  pinImageObjectURL(innerImg.id);
                }
                setFullMediaUrl(loadedUrl);
                setDisplayUrl(loadedUrl);
              }
            }
          })
          .catch(() => {});
      },
      { rootMargin: "0px" }
    );

    const unsubscribeScrollStop = onGalleryScrollStop(() => {
      if (!isMounted) return;
      // Item longe da tela (fora da visão e da zona de pré-carga): nada a fazer ao parar de rolar
      if (!isVisibleRef.current && !isPreloadIntersectingRef.current) return;
      const currentImg = latestImgRef.current;
      const active = getActiveMediaUrl(currentImg);
      if (active) {
        if (isVisibleRef.current) {
          if (currentImg.isVideo) pinVideoObjectURL(currentImg.id);
          else pinImageObjectURL(currentImg.id);
          setFullMediaUrl(active);
          setDisplayUrl(active);
        }
        return;
      }

      // Priority 2: Prepare visible items when scrolling stops
      if (isVisibleRef.current) {
        ensureMediaLoaded(2)
          .then(() => {
            if (!isMounted) return;
            const innerImg = latestImgRef.current;
            if (isVisibleRef.current) {
              const loadedUrl = getActiveMediaUrl(innerImg);
              if (loadedUrl) {
                if (innerImg.isVideo) pinVideoObjectURL(innerImg.id);
                else pinImageObjectURL(innerImg.id);
                setFullMediaUrl(loadedUrl);
                setDisplayUrl(loadedUrl);
              }
            }
          })
          .catch(() => {});
      } else if (isPreloadIntersectingRef.current) {
        // Priority 1: Preload approaching items in background
        ensureMediaLoaded(1).catch(() => {});
      }
    });

    if (itemRef.current) {
      preloadObserver.observe(itemRef.current);
      visibilityObserver.observe(itemRef.current);
    }

    return () => {
      isMounted = false;
      isVisibleRef.current = false;
      isPreloadIntersectingRef.current = false;
      mediaLoadRef.current = null;
      unsubscribeScrollStop();
      preloadObserver.disconnect();
      visibilityObserver.disconnect();
      const currentImg = latestImgRef.current;
      cancelQueuedMediaLoad(currentImg.id); // Cancel queued preload on unmount
      if (currentImg.isVideo) unpinVideoObjectURL(currentImg.id);
      else unpinImageObjectURL(currentImg.id);
    };
  }, [img.id, img.isVideo, fetchFullMedia]);

  const handleMediaLoad = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>) => {
    const target = e.currentTarget;
    const naturalWidth = "naturalWidth" in target ? target.naturalWidth : target.videoWidth;
    const naturalHeight = "naturalHeight" in target ? target.naturalHeight : target.videoHeight;
    if (naturalWidth && naturalHeight) {
      const ratio = naturalWidth / naturalHeight;
      saveAspectRatio(img.id, ratio);
      setAspectRatio((prev) => {
        if (prev && Math.abs(prev - ratio) < 0.005) {
          return prev;
        }
        return ratio;
      });
    }
  };

  const handleImageError = () => {
    setFullMediaUrl(null);
    if (displayUrl !== img.url) setDisplayUrl(img.url);
  };

  return {
    itemRef,
    displayUrl,
    fullMediaUrl,
    isVisible,
    aspectRatio,
    handleMediaLoad,
    handleImageError,
  };
}
