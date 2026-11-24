import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, useIsPresent } from 'motion/react';
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

  const lastValidIdRef = React.useRef(selectedImageId);
  if (selectedImageId) {
    lastValidIdRef.current = selectedImageId;
  }
  const effectiveImageId = selectedImageId || lastValidIdRef.current;

  const currentImg = useMemo(() => {
    return images.find((img) => img.id === effectiveImageId) || images[0];
  }, [images, effectiveImageId]);

  const isVideo =
    selectedImageIsVideo ||
    currentImg?.isVideo ||
    currentImg?.contentType?.startsWith('video/') ||
    false;

  // Fotos: o contêiner não esmaece na saída, então os controles somem assim que o fechamento começa.
  const isPresent = useIsPresent();
  const controlsVisible = isVideo ? showControls : showControls && isPresent;

  React.useEffect(() => {
    document.documentElement.classList.add('lightbox-open');
    document.body.classList.add('lightbox-open');

    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.documentElement.classList.remove('lightbox-open');
      document.body.classList.remove('lightbox-open');
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  const handleContainerClick = () => {
    onClose();
  };

  return (
    <motion.div
      id="lightbox-backdrop"
      key="fullscreen-image"
      // Fotos: só o fundo esmaece; a foto em transição (layoutId) fica 100% opaca
      // e não herda a opacidade do contêiner. Vídeos mantêm o comportamento anterior.
      initial={{ opacity: isVideo ? 0 : 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: isVideo ? 0 : 1 }}
      transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 overflow-hidden select-none"
      onClick={handleContainerClick}
    >
      {/* Fundo preto sincronizado com a abertura/fechamento */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: isVideo ? 1 : 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: isVideo ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
        className="absolute inset-0 -z-10 bg-black pointer-events-none"
      />
      {/* Photo Controls: only shown for regular images when controls are visible */}
      {!isVideo && (
        <AnimatePresence>
          {controlsVisible && (
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
        selectedImageId={effectiveImageId}
        selectedImageIsVideo={selectedImageIsVideo}
        downloadingFull={downloadingFull}
        fullDownloadProgress={fullDownloadProgress}
        imageFit={imageFit}
        setImageFit={setImageFit}
        showControls={controlsVisible}
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
        activeMediaUrl={selectedImage}
      />
    </motion.div>
  );
}
export type { DecryptedImage } from '../types';
