import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LightboxNavControls } from '../LightboxNavControls';

interface LightboxSurfaceOverlaysProps {
  isCurrentVideo: boolean;
  isPlaybackActive: boolean;
  showControls: boolean;
  hoverMode?: boolean;
  hoverSide?: 'left' | 'right' | null;
  currentIndex: number;
  totalImages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function LightboxSurfaceOverlays({
  isCurrentVideo,
  isPlaybackActive,
  showControls,
  hoverMode,
  hoverSide,
  currentIndex,
  totalImages,
  onPrev,
  onNext,
}: LightboxSurfaceOverlaysProps) {
  return (
    <>
      {!isCurrentVideo && (
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
      )}
      {!isPlaybackActive && (
        <LightboxNavControls
          showControls={showControls}
          hoverMode={hoverMode}
          hoverSide={hoverSide}
          currentIndex={currentIndex}
          totalImages={totalImages}
          onPrev={onPrev}
          onNext={onNext}
        />
      )}
    </>
  );
}
