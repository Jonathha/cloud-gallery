import React, { useRef } from 'react';
import {
  LightboxSlideMobileContentProps,
  LightboxMobileTouchRefs,
} from './mobile/lightboxSlideMobileTypes';
import { createMobileTouchStartCapture } from './mobile/lightboxSlideMobileTouchStart';
import { createMobileTouchMoveCapture } from './mobile/lightboxSlideMobileTouchMove';
import { resolveLightboxMobileUrls } from './mobile/lightboxSlideMobileUrls';
import { LightboxSlideMobileVideoActive } from './mobile/LightboxSlideMobileVideoActive';
import { LightboxSlideMobileVideoPreview } from './mobile/LightboxSlideMobileVideoPreview';
import { LightboxSlideMobilePhotoView } from './mobile/LightboxSlideMobilePhotoView';

export type { LightboxSlideMobileContentProps };

export function LightboxSlideMobileContent(props: LightboxSlideMobileContentProps) {
  const { img, isCurrent, selectedImage, imageFit, isZoomed, setIsZoomed } = props;

  const refs: LightboxMobileTouchRefs = {
    currentScaleRef: useRef(1),
    transformRef: useRef<any>(null),
    touchStartPosRef: useRef<{ x: number; y: number } | null>(null),
    lastTapPosRef: useRef<{ x: number; y: number } | null>(null),
    touchMovedRef: useRef(false),
  };

  const handleTouchStartCapture = createMobileTouchStartCapture(refs);
  const handleTouchMoveCapture = createMobileTouchMoveCapture(refs);
  const { isVideo, thumbnailUrl, activeOriginalUrl, validVideoSrc } =
    resolveLightboxMobileUrls(img, isCurrent, selectedImage);

  if (isVideo && isCurrent) {
    return <LightboxSlideMobileVideoActive {...props} validVideoSrc={validVideoSrc} />;
  }

  if (isVideo && !isCurrent) {
    return <LightboxSlideMobileVideoPreview img={img} imageFit={imageFit} />;
  }

  return (
    <LightboxSlideMobilePhotoView
      img={img}
      isCurrent={isCurrent}
      isZoomed={isZoomed}
      setIsZoomed={setIsZoomed}
      imageFit={imageFit}
      thumbnailUrl={thumbnailUrl}
      activeOriginalUrl={activeOriginalUrl}
      refs={refs}
      onTouchStartCapture={handleTouchStartCapture}
      onTouchMoveCapture={handleTouchMoveCapture}
    />
  );
}
