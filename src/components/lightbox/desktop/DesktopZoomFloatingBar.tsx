import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useControls } from 'react-zoom-pan-pinch';

interface DesktopZoomFloatingBarProps {
  scale: number;
  showControls: boolean;
}

/**
 * Desktop Floating Zoom Dock
 * Provides instant Zoom In, Zoom Out, Zoom Reset and % display for PC users
 */
export default function DesktopZoomFloatingBar({
  scale,
  showControls,
}: DesktopZoomFloatingBarProps) {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  return (
    <AnimatePresence>
      {showControls && (
        <motion.div
          id="lightbox-desktop-zoom-bar"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute bottom-20 right-8 z-30 flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-white/15 shadow-2xl text-white select-none pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            id="lightbox-btn-zoom-out"
            type="button"
            onClick={() => zoomOut(0.4)}
            disabled={scale <= 1.01}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ZoomOut size={17} />
          </button>

          <button
            id="lightbox-btn-zoom-reset"
            type="button"
            onClick={() => resetTransform()}
            className="px-2 py-0.5 rounded-md text-xs font-mono font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all cursor-pointer min-w-[48px] text-center"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            id="lightbox-btn-zoom-in"
            type="button"
            onClick={() => zoomIn(0.4)}
            disabled={scale >= 7.9}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <ZoomIn size={17} />
          </button>

          {scale > 1.02 && (
            <button
              id="lightbox-btn-zoom-fit"
              type="button"
              onClick={() => resetTransform()}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer ml-1 border-l border-white/10 pl-2"
            >
              <RotateCcw size={15} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
