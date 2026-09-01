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
  const [aspectRatio, setAspectRatio] = useState<number>(1);

  useEffect(() => {
    setDisplayUrl((prev) => {
      const original = img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
      return original || img.originalUrl || img.url || prev;
    });
  }, [img.url, img.originalUrl, img.id, img.isVideo]);

  useEffect(() => {
    let isMounted = true;
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0].isIntersecting;
        isVisibleRef.current = isVisible;

        if (!isVisible) {
          setDisplayUrl(img.url);
          if (img.isVideo) {
            revokeVideoObjectURL(img.id);
          } else {
            revokeImageObjectURL(img.id);
          }
          return;
        }

        fetchFullMedia(img, true)
          .then(() => {
            if (!isMounted || !isVisibleRef.current) {
              if (img.isVideo) {
                revokeVideoObjectURL(img.id);
              } else {
                revokeImageObjectURL(img.id);
              }
              return;
            }

            const original = img.isVideo ? getVideoObjectURL(img.id) : getImageObjectURL(img.id);
            if (original) {
              setDisplayUrl(original);
            }
          })
          .catch(() => {});
      },
      { rootMargin: "300px" }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => {
      isMounted = false;
      observer.disconnect();
      isVisibleRef.current = false;
      if (img.isVideo) {
        revokeVideoObjectURL(img.id);
      } else {
        revokeImageObjectURL(img.id);
      }
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
      setDisplayUrl(img.url);
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
