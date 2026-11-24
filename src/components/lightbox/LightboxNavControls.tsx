import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxNavControlsProps {
  showControls: boolean;
  hoverMode?: boolean;
  hoverSide?: 'left' | 'right' | null;
  currentIndex: number;
  totalImages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function LightboxNavControls({
  showControls,
  hoverMode = false,
  hoverSide = null,
  currentIndex,
  totalImages,
  onPrev,
  onNext
}: LightboxNavControlsProps) {
  const showPrev = hoverMode ? hoverSide === 'left' : showControls;
  const showNext = hoverMode ? hoverSide === 'right' : showControls;

  return (
    <AnimatePresence>
          {showPrev && currentIndex > 0 && (
            <motion.button
              key="lightbox-nav-prev"
              id="lightbox-nav-prev"
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={(e) => {
                e.stopPropagation();
                if (currentIndex > 0) {
                  onPrev();
                }
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 active:scale-90 hidden sm:block z-30"
            >
              <ChevronLeft size={32} />
            </motion.button>
          )}
          {showNext && currentIndex < totalImages - 1 && (
            <motion.button
              key="lightbox-nav-next"
              id="lightbox-nav-next"
              type="button"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                if (currentIndex < totalImages - 1) {
                  onNext();
                }
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 active:scale-90 hidden sm:block z-30"
            >
              <ChevronRight size={32} />
            </motion.button>
          )}
    </AnimatePresence>
  );
}
