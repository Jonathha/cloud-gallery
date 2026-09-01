import { useRef, useState, useEffect } from "react";
import { DecryptedImage } from "../../../types";
import { getImageObjectURL, getVideoObjectURL } from "../../../utils/fileCrypto";

interface UseGalleryItemObserverProps {
  img: DecryptedImage;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>;
}

export function useGalleryItemObserver({ img, fetchFullMedia }: UseGalleryItemObserverProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string>(img.url);
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  useEffect(() => {
    setDisplayUrl((prev) => {
      const original = img.isVideo ? null : getImageObjectURL(img.id);
      return original || img.originalUrl || img.url || prev;
    });
  }, [img.url, img.originalUrl, img.id, img.isVideo]);

  useEffect(() => {
    let isMounted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !img.isVideo) {
          fetchFullMedia(img, true)
            .then(() => {
              if (isMounted) {
                const original = getImageObjectURL(img.id);
                if (original) {
                  setDisplayUrl(original);
                }
              }
            })
            .catch(() => {});
        }
      },
      { rootMargin: "300px" }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [img, fetchFullMedia]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
  };

  const handleImageError = () => {
    if (displayUrl !== img.url) {
      setDisplayUrl(img.url); // Fallback to thumbnail if LRU kicked it out
    }
  };

  return {
    itemRef,
    displayUrl,
    aspectRatio,
    handleImageLoad,
    handleImageError,
  };
}
