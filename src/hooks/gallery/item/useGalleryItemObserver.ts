import { useRef, useState, useEffect } from "react";
import { DecryptedImage } from "../../../types";
import { getImageObjectURL, getVideoObjectURL, revokeImageObjectURL, revokeVideoObjectURL } from "../../../utils/fileCrypto";

interface UseGalleryItemObserverProps {
  img: DecryptedImage;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>;
}

export function useGalleryItemObserver({ img, fetchFullMedia }: UseGalleryItemObserverProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(false);
  const [displayUrl, setDisplayUrl] = useState<string>(img.url);
  const [isVisible, setIsVisible] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  useEffect(() => {
    setDisplayUrl((prev) => {
      const original = img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
      return original || img.originalUrl || img.url || prev;
    });
  }, [img.url, img.originalUrl, img.id, img.isVideo]);

  useEffect(() => {
    let isMounted = true;

    const releaseOriginal = () => {
      if (img.isVideo) {
        revokeVideoObjectURL(img.id);
      } else {
        revokeImageObjectURL(img.id);
      }
      img.originalUrl = undefined;
    };

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;

        fetchFullMedia(img, true)
          .then(() => {
            if (!isMounted || !isVisibleRef.current) return;
            const original = img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
            if (original) setDisplayUrl(original);
          })
          .catch(() => {});
      },
      { rootMargin: "300px" }
    );

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting;
        isVisibleRef.current = visible;
        setIsVisible(visible);

        if (!visible) {
          setDisplayUrl(img.url);
          return;
        }

        const original = img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
        if (original) {
          setDisplayUrl(original);
          return;
        }

        fetchFullMedia(img, true)
          .then(() => {
            if (!isMounted || !isVisibleRef.current) return;
            const loadedUrl = img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
            if (loadedUrl) setDisplayUrl(loadedUrl);
          })
          .catch(() => {});
      },
      { rootMargin: "0px" }
    );

    if (itemRef.current) {
      preloadObserver.observe(itemRef.current);
      visibilityObserver.observe(itemRef.current);
    }

    return () => {
      isMounted = false;
      isVisibleRef.current = false;
      preloadObserver.disconnect();
      visibilityObserver.disconnect();
      releaseOriginal();
    };
  }, [img, fetchFullMedia]);

  const handleMediaLoad = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement, Event>) => {
    const target = e.currentTarget;
    const naturalWidth = "naturalWidth" in target ? target.naturalWidth : target.videoWidth;
    const naturalHeight = "naturalHeight" in target ? target.naturalHeight : target.videoHeight;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
  };

  const handleImageError = () => {
    if (displayUrl !== img.url) {
      setDisplayUrl(img.url);
    }
  };

  return {
    itemRef,
    displayUrl,
    isVisible,
    aspectRatio,
    handleMediaLoad,
    handleImageError,
  };
}
