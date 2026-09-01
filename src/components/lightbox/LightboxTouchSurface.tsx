import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';
import { DecryptedImage } from '../../types';
import { LightboxSlideContent } from './LightboxSlideContent';
import { LightboxNavControls } from './LightboxNavControls';

interface LightboxTouchSurfaceProps {
  images: DecryptedImage[];
  selectedImage: string | null;
  selectedImageId: string;
  selectedImageIsVideo: boolean;
  downloadingFull: boolean;
  fullDownloadProgress: string;
  imageFit: 'contain' | 'cover';
  setImageFit?: (fit: 'contain' | 'cover') => void;
  showControls: boolean;
  isZoomed: boolean;
  setIsZoomed: (zoomed: boolean) => void;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  setIsShareOpen?: (open: boolean) => void;
}

export default function LightboxTouchSurface({
  images,
  selectedImage,
  selectedImageId,
  selectedImageIsVideo,
  downloadingFull,
  fullDownloadProgress,
  imageFit,
  setImageFit,
  showControls,
  isZoomed,
  setIsZoomed,
  setShowControls,
  onClose,
  onNext,
  onPrev,
  onDelete,
  onOpenDetails,
  setIsShareOpen,
}: LightboxTouchSurfaceProps) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(() => window.innerWidth);
  const [isPlaybackActive, setIsPlaybackActive] = useState(false);

  const currentIndex = images.findIndex((img) => img.id === selectedImageId);
  const currentItem = images[currentIndex] || images[0];
  const isCurrentVideo =
    selectedImageIsVideo ||
    currentItem?.isVideo ||
    currentItem?.contentType?.startsWith('video/') ||
    false;

  const baseX = -currentIndex * (containerWidth + 40);

  const x = useMotionValue(-currentIndex * (containerWidth + 40));
  const lastIndex = useRef(currentIndex);
  const currentIndexRef = useRef(currentIndex);

  const transitionConfig = { ease: [0.32, 0.72, 0, 1] as const, duration: 0.28 };

  // Keep currentIndexRef in sync
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Initial measurement on mount
  useEffect(() => {
    const width = containerRef.current?.clientWidth || window.innerWidth;
    setContainerWidth(width);
    x.set(-currentIndexRef.current * (width + 40));
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth;
      setContainerWidth(width);
      x.set(-currentIndexRef.current * (width + 40));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [x]);

  useEffect(() => {
    if (currentIndex !== -1 && currentIndex !== lastIndex.current) {
      lastIndex.current = currentIndex;
      animate(x, baseX, transitionConfig);
    }
  }, [currentIndex, baseX, x]);

  const handleDragEnd = (event: any, info: any) => {
    if (isZoomed || isPlaybackActive) return;
    const threshold = containerWidth * 0.2;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset < -threshold || (offset < -40 && velocity < -150)) {
      if (currentIndex < images.length - 1) onNext();
      else animate(x, baseX, transitionConfig);
    } else if (offset > threshold || (offset > 40 && velocity > 150)) {
      if (currentIndex > 0) onPrev();
      else animate(x, baseX, transitionConfig);
    } else {
      animate(x, baseX, transitionConfig);
    }
  };

  const handleControlsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowControls((prev) => !prev);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 1 || isZoomed || isPlaybackActive) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current || isZoomed || isPlaybackActive) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const distanceX = touchStartX.current - touchEndX;
    const distanceY = touchStartY.current - touchEndY;

    // Swipe down to close
    if (Math.abs(distanceY) > Math.abs(distanceX) && distanceY < -120) {
      onClose();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const canDrag = !isZoomed && !isPlaybackActive;

  return (
    <div
      ref={containerRef}
      id="lightbox-touch-surface"
      className="w-full h-full flex items-center justify-center relative select-none"
      onClick={handleControlsClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        id="lightbox-slide-track"
        style={{ x }}
        drag={canDrag ? 'x' : false}
        dragConstraints={{
          left: -(images.length - 1) * (containerWidth + 40),
          right: 0,
        }}
        dragElastic={canDrag ? 0.1 : 0}
        onDragEnd={handleDragEnd}
        className="absolute inset-y-0 left-0 w-full h-full pointer-events-auto flex items-center bg-black"
      >
        {images.map((img, index) => {
          const isNear = Math.abs(index - currentIndex) <= 1;
          const isCurrent = index === currentIndex;
          if (!isNear) return null;
          return (
            <div
              key={img.id}
              style={{
                position: 'absolute',
                left: index * (containerWidth + 40),
                width: containerWidth,
                height: '100%',
              }}
            >
              <LightboxSlideContent
                img={img}
                isCurrent={isCurrent}
                selectedImage={selectedImage}
                downloadingFull={downloadingFull}
                imageFit={imageFit}
                setImageFit={setImageFit}
                isZoomed={isZoomed}
                setIsZoomed={setIsZoomed}
                showControls={showControls}
                setShowControls={setShowControls}
                onClose={onClose}
                onDelete={onDelete}
                onOpenDetails={onOpenDetails}
                setIsShareOpen={setIsShareOpen}
                setIsPlaybackActive={setIsPlaybackActive}
              />
            </div>
          );
        })}
      </motion.div>

      {/* Top and Bottom Gradient black bars for regular photos when controls are visible */}
      {!isCurrentVideo && (
        <>
          <AnimatePresence>
            {showControls && (
              <motion.div
                id="lightbox-top-black-bar"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'tween', ease: 'easeOut', duration: 0.18 }}
                className="absolute top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b from-black/70 to-transparent z-20 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showControls && (
              <motion.div
                id="lightbox-bottom-black-bar"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'tween', ease: 'easeOut', duration: 0.18 }}
                className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 bg-black/95 z-20 border-t border-white/5 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </>
      )}

      {/* Desktop Left/Right Navigation Arrows */}
      {!isPlaybackActive && (
        <LightboxNavControls
          showControls={showControls}
          currentIndex={currentIndex}
          totalImages={images.length}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </div>
  );
}
