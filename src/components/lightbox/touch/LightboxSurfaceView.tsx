import React, { useState } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { LightboxSurfaceViewProps } from './lightboxSurfaceViewTypes';
import { LightboxSlideTrackItem } from './LightboxSlideTrackItem';
import { LightboxSurfaceOverlays } from './LightboxSurfaceOverlays';
import { getFreeSide, FreeSide } from './lightboxSurfaceCaptureHandlers';
import { useIsDesktop } from '../../../utils/deviceType';

export function LightboxSurfaceView({
  props,
  refs,
  containerWidth,
  currentIndex,
  isCurrentVideo,
  isPlaybackActive,
  setIsPlaybackActive,
  handleTrackPointerDown,
  handleDragStart,
  handleDragEnd,
  capture,
  swipeClose,
}: LightboxSurfaceViewProps) {
  const canDrag = !props.isZoomed && !isPlaybackActive;
  const isDesktop = useIsDesktop();
  const [hoverSide, setHoverSide] = useState<FreeSide | null>(null);
  const hoverEnabled = isDesktop && !props.isZoomed && !isPlaybackActive;
  // Ao fechar (saída em andamento) as setas laterais somem junto com os demais controles.
  const isPresent = useIsPresent();
  const activeSide = hoverEnabled && isPresent ? hoverSide : null;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hoverEnabled) return;
    if (e.target instanceof Element && e.target.closest('#lightbox-nav-prev, #lightbox-nav-next')) return;
    let side = getFreeSide(e.target, e.clientX, refs.containerRef.current);
    if (
      (side === 'left' && currentIndex <= 0) ||
      (side === 'right' && currentIndex >= props.images.length - 1)
    ) {
      side = null;
    }
    setHoverSide(side);
  };

  return (
    <div
      ref={refs.containerRef}
      id="lightbox-touch-surface"
      className="w-full h-full flex items-center justify-center relative select-none overflow-hidden"
      onClick={capture.handleControlsClick}
      onMouseMove={isDesktop ? handleMouseMove : undefined}
      onMouseLeave={isDesktop ? () => setHoverSide(null) : undefined}
      style={activeSide ? { cursor: 'pointer' } : undefined}
      onPointerDownCapture={capture.handlePointerDownCapture}
      onTouchStartCapture={capture.handleTouchStartCapture}
      onTouchMoveCapture={capture.handleTouchMoveCapture}
      onTouchStart={swipeClose.handleTouchStart}
      onTouchEnd={swipeClose.handleTouchEnd}
    >
      <motion.div
        id="lightbox-slide-track"
        style={{ x: refs.x }}
        drag={canDrag ? 'x' : false}
        dragConstraints={{ left: -(props.images.length - 1) * (containerWidth + 40), right: 0 }}
        dragElastic={canDrag ? 0.1 : 0}
        onPointerDown={handleTrackPointerDown}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="absolute inset-y-0 left-0 w-full h-full pointer-events-auto flex items-center bg-transparent"
      >
        {props.images.map((img, index) => (
          <LightboxSlideTrackItem
            key={img.id}
            img={img}
            index={index}
            currentIndex={currentIndex}
            containerWidth={containerWidth}
            surfaceProps={props}
            setIsPlaybackActive={setIsPlaybackActive}
          />
        ))}
      </motion.div>
      <LightboxSurfaceOverlays
        isCurrentVideo={isCurrentVideo}
        isPlaybackActive={isPlaybackActive}
        showControls={props.showControls}
        hoverMode={isDesktop}
        hoverSide={activeSide}
        currentIndex={currentIndex}
        totalImages={props.images.length}
        onPrev={props.onPrev}
        onNext={props.onNext}
      />
    </div>
  );
}
