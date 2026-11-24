import React, { useState } from 'react';
import { LightboxTouchSurfaceProps } from './touch/lightboxTouchSurfaceTypes';
import { useLightboxTouchState } from './touch/useLightboxTouchRefs';
import { createAnimateToBase } from './touch/lightboxTouchAnimate';
import { useLightboxTouchLayoutEffects } from './touch/useLightboxTouchLayoutEffects';
import { useLightboxWindowPointerGuard } from './touch/useLightboxWindowPointerGuard';
import { createTrackPointerDown, createDragStart } from './touch/lightboxTrackPointerDragStart';
import { createDragEnd } from './touch/lightboxTrackDragEnd';
import { createSurfaceCaptureHandlers } from './touch/lightboxSurfaceCaptureHandlers';
import { createSurfaceSwipeCloseHandlers } from './touch/lightboxSurfaceSwipeCloseHandlers';
import { LightboxSurfaceView } from './touch/LightboxSurfaceView';
import { useIsDesktop } from '../../utils/deviceType';

export default function LightboxTouchSurface(props: LightboxTouchSurfaceProps) {
  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);
  const { refs, currentIndex, isCurrentVideo, baseX } = useLightboxTouchState(props, containerWidth);

  const animateToBase = createAnimateToBase(refs);
  useLightboxTouchLayoutEffects(refs, currentIndex, baseX, setContainerWidth, animateToBase);
  useLightboxWindowPointerGuard(refs, animateToBase);

  const handleTrackPointerDown = createTrackPointerDown(refs, containerWidth, animateToBase);
  const handleDragStart = createDragStart(refs);
  const handleDragEnd = createDragEnd({
    refs,
    images: props.images,
    currentIndex,
    containerWidth,
    baseX,
    isZoomed: props.isZoomed,
    isPlaybackActive,
    animateToBase,
    onNext: props.onNext,
    onPrev: props.onPrev,
  });

  const isDesktop = useIsDesktop();
  const capture = createSurfaceCaptureHandlers(refs, props.setShowControls, {
    enabled: isDesktop && !props.isZoomed && !isPlaybackActive,
    hasPrev: currentIndex > 0,
    hasNext: currentIndex < props.images.length - 1,
    onPrev: props.onPrev,
    onNext: props.onNext,
  });
  const swipeClose = createSurfaceSwipeCloseHandlers(refs, props.isZoomed, isPlaybackActive, props.onClose);

  return (
    <LightboxSurfaceView
      props={props}
      refs={refs}
      containerWidth={containerWidth}
      currentIndex={currentIndex}
      isCurrentVideo={isCurrentVideo}
      isPlaybackActive={isPlaybackActive}
      setIsPlaybackActive={setIsPlaybackActive}
      handleTrackPointerDown={handleTrackPointerDown}
      handleDragStart={handleDragStart}
      handleDragEnd={handleDragEnd}
      capture={capture}
      swipeClose={swipeClose}
    />
  );
}
