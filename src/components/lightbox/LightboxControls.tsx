import React from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Maximize2,
  Minimize2,
  Maximize,
  Minimize,
  Share2,
  Download,
  Info,
} from 'lucide-react';
import TrashIcon from '../icons/TrashIcon';

interface LightboxControlsProps {
  selectedImage: string | null;
  imageFit: 'contain' | 'cover';
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  setImageFit: (fit: 'contain' | 'cover') => void;
  setIsShareOpen: (open: boolean) => void;
  onClose: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  selectedImageIsVideo?: boolean;
  contentType?: string;
}

export default function LightboxControls({
  selectedImage,
  imageFit,
  isFullscreen,
  onToggleFullscreen,
  setImageFit,
  setIsShareOpen,
  onClose,
  onDelete,
  onOpenDetails,
  selectedImageIsVideo,
  contentType,
}: LightboxControlsProps) {
  const extension = React.useMemo(() => {
    if (selectedImageIsVideo) return 'mp4';
    if (!contentType) return 'png';
    const parts = contentType.split('/');
    if (parts.length === 2) {
      const ext = parts[1];
      if (ext === 'jpeg') return 'jpg';
      if (ext === 'svg+xml') return 'svg';
      return ext;
    }
    return 'png';
  }, [selectedImageIsVideo, contentType]);

  return (
    <motion.div
      id="lightbox-photo-controls-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between"
    >
      {/* Top Bar: Close button on left, Fit, Fullscreen & Delete on right */}
      <div className="w-full flex items-center justify-between px-4 pt-4 sm:pt-6 sm:px-6 pointer-events-auto bg-gradient-to-b from-black/80 to-transparent pb-4">
        {/* Left: Close / Back Button */}
        <button
          id="lightbox-btn-close"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-2.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
        >
          <ChevronLeft size={28} className="stroke-[2.2]" />
        </button>

        {/* Right: Fit & Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="lightbox-btn-fit"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setImageFit(imageFit === 'contain' ? 'cover' : 'contain');
            }}
            className="p-2.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          >
            {imageFit === 'contain' ? <Maximize size={22} /> : <Minimize size={22} />}
          </button>

          {!(typeof window !== 'undefined' && (window as any).AndroidBridge) && (
            <button
              id="lightbox-btn-fullscreen"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFullscreen();
              }}
              className="p-2.5 text-white/90 hover:text-white rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Action Bar: Info, Share, Download, Delete */}
      <div className="w-full px-8 py-4 pb-8 sm:pb-6 flex items-center justify-around pointer-events-auto mt-auto">
        {/* 1. Info */}
        {onOpenDetails && (
          <button
            id="lightbox-btn-info"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className="p-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] hover:opacity-80 active:scale-90 transition-all cursor-pointer"
          >
            <Info size={24} className="stroke-[2]" />
          </button>
        )}

        {/* 2. Share */}
        <button
          id="lightbox-btn-share"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsShareOpen(true);
          }}
          className="p-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] hover:opacity-80 active:scale-90 transition-all cursor-pointer"
        >
          <Share2 size={24} className="stroke-[2]" />
        </button>

        {/* 3. Download */}
        <a
          id="lightbox-btn-download"
          href={selectedImage || ''}
          download={
            selectedImageIsVideo
              ? `secure-video-${Date.now()}.${extension}`
              : `secure-image-${Date.now()}.${extension}`
          }
          onClick={(e) => e.stopPropagation()}
          className="p-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] hover:opacity-80 active:scale-90 transition-all cursor-pointer"
        >
          <Download size={24} className="stroke-[2]" />
        </a>

        {/* 4. Delete */}
        {onDelete && (
          <button
            id="lightbox-btn-delete"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-3 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] hover:text-red-400 active:scale-90 transition-all cursor-pointer"
          >
            <TrashIcon size={24} className="stroke-[2]" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
