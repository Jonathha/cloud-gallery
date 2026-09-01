import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LightboxControls from './lightbox/LightboxControls';
import LightboxTouchSurface from './lightbox/LightboxTouchSurface';
import ImageDetailsModal from './lightbox/ImageDetailsModal';
import { DecryptedImage } from '../types';

interface LightboxProps {
  images: DecryptedImage[];
  selectedImage: string | null;
  selectedImageId: string;
  selectedImageIsVideo: boolean;
  downloadingFull: boolean;
  fullDownloadProgress: string;
  imageFit: 'contain' | 'cover';
  showControls: boolean;
  isZoomed: boolean;
  isFullscreen: boolean;
  setIsZoomed: (zoomed: boolean) => void;
  setImageFit: (fit: 'contain' | 'cover') => void;
  setIsShareOpen: (open: boolean) => void;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleFullscreen: () => void;
  onDelete?: () => void;
}

export default function Lightbox({
  images,
  selectedImage,
  selectedImageId,
  selectedImageIsVideo,
  downloadingFull,
  fullDownloadProgress,
  imageFit,
  showControls,
  isZoomed,
  isFullscreen,
  setIsZoomed,
  setImageFit,
  setIsShareOpen,
  setShowControls,
  onClose,
  onNext,
  onPrev,
  onToggleFullscreen,
  onDelete,
}: LightboxProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const currentImg = useMemo(() => {
    return images.find((img) => img.id === selectedImageId) || images[0];
  }, [images, selectedImageId]);

  const isVideo =
    selectedImageIsVideo ||
    currentImg?.isVideo ||
    currentImg?.contentType?.startsWith('video/') ||
    false;

  const handleContainerClick = () => {
    onClose();
  };

  return (
    <motion.div
      id="lightbox-backdrop"
      key="fullscreen-image"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center p-0"
      onClick={handleContainerClick}
    >
      {/* Photo Controls: only shown for regular images when controls are visible */}
      {!isVideo && (
        <AnimatePresence>
          {showControls && (
            <LightboxControls
              selectedImage={selectedImage}
              imageFit={imageFit}
              isFullscreen={isFullscreen}
              onToggleFullscreen={onToggleFullscreen}
              setImageFit={setImageFit}
              setIsShareOpen={setIsShareOpen}
              onClose={onClose}
              onDelete={onDelete}
              onOpenDetails={() => setIsDetailsOpen(true)}
              selectedImageIsVideo={selectedImageIsVideo}
              contentType={currentImg?.contentType}
            />
          )}
        </AnimatePresence>
      )}

      {/* Unified Touch Surface / Carousel supporting Photos & Videos */}
      <LightboxTouchSurface
        images={images}
        selectedImage={selectedImage}
        selectedImageId={selectedImageId}
        selectedImageIsVideo={selectedImageIsVideo}
        downloadingFull={downloadingFull}
        fullDownloadProgress={fullDownloadProgress}
        imageFit={imageFit}
        setImageFit={setImageFit}
        showControls={showControls}
        isZoomed={isZoomed}
        setIsZoomed={setIsZoomed}
        setShowControls={setShowControls}
        onClose={onClose}
        onNext={onNext}
        onPrev={onPrev}
        onDelete={onDelete}
        onOpenDetails={() => setIsDetailsOpen(true)}
        setIsShareOpen={setIsShareOpen}
      />

      {/* Vault Media Details Modal */}
      <ImageDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        image={currentImg}
      />
    </motion.div>
  );
}
export type { DecryptedImage } from '../types';
