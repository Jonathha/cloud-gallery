import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxNavControlsProps {
  showControls: boolean;
  currentIndex: number;
  totalImages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function LightboxNavControls({
  showControls,
  currentIndex,
  totalImages,
  onPrev,
  onNext
}: LightboxNavControlsProps) {
  return (
    <AnimatePresence>
      {showControls && (
        <>
          {currentIndex > 0 && (
            <motion.button
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
          {currentIndex < totalImages - 1 && (
            <motion.button
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
        </>
      )}
    </AnimatePresence>
  );
}
