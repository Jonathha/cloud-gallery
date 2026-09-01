import React, { useRef, useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { DecryptedImage } from '../../types';
import { getImageObjectURL } from '../../utils/fileCrypto';
import LightboxVideoPlayer from './LightboxVideoPlayer';

interface LightboxSlideContentProps {
  img: DecryptedImage;
  isCurrent: boolean;
  selectedImage: string | null;
  downloadingFull: boolean;
  imageFit: 'contain' | 'cover';
  setImageFit?: (fit: 'contain' | 'cover') => void;
  isZoomed: boolean;
  setIsZoomed: (zoomed: boolean) => void;
  showControls: boolean;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  onClose: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
  setIsShareOpen?: (open: boolean) => void;
  setIsPlaybackActive?: (active: boolean) => void;
}

export function LightboxSlideContent({
  img,
  isCurrent,
  selectedImage,
  downloadingFull,
  imageFit,
  setImageFit,
  isZoomed,
  setIsZoomed,
  showControls,
  setShowControls,
  onClose,
  onDelete,
  onOpenDetails,
  setIsShareOpen,
  setIsPlaybackActive,
}: LightboxSlideContentProps) {
  const currentScaleRef = useRef(1);
  const transformRef = useRef<any>(null);

  const isVideo = img.isVideo || img.contentType?.startsWith('video/') || false;

  // Resolve thumbnail preview URL
  const thumbnailUrl = img.url || '';

  // Resolve high-resolution original URL (from active ObjectURL registry or state)
  const cachedOriginal = getImageObjectURL(img.id);
  const activeOriginalUrl =
    cachedOriginal ||
    (selectedImage &&
    (selectedImage.startsWith('blob:') || selectedImage.startsWith('data:image/')) &&
    selectedImage !== img.url
      ? selectedImage
      : null) ||
    (img.originalUrl &&
    (img.originalUrl.startsWith('blob:') || img.originalUrl.startsWith('data:image/')) &&
    img.originalUrl !== img.url
      ? img.originalUrl
      : null);

  const hasOriginal = Boolean(activeOriginalUrl);

  const [isOriginalLoaded, setIsOriginalLoaded] = useState(() => {
    return Boolean(activeOriginalUrl); // If we already have the blob, assume it's loaded instantly to prevent flash
  });

  useEffect(() => {
    // Only reset if we don't have the original yet for the current image
    setIsOriginalLoaded(Boolean(activeOriginalUrl));
  }, [img.id, activeOriginalUrl]);

  const validVideoSrc = (isVideo && isCurrent)
    ? ((selectedImage && (selectedImage.startsWith('blob:') || selectedImage.startsWith('data:video/')))
      ? selectedImage
      : (img.originalUrl && (img.originalUrl.startsWith('blob:') || img.originalUrl.startsWith('data:video/')))
        ? img.originalUrl
        : (img.url && (img.url.startsWith('blob:') || img.url.startsWith('data:video/')))
          ? img.url
          : undefined)
    : undefined;

  // If this slide is a video and is currently selected
  if (isVideo && isCurrent) {
    return (
      <div className="w-full h-full relative bg-black select-none">
        <LightboxVideoPlayer
          img={img}
          src={validVideoSrc}
          isCurrent={isCurrent}
          showControls={showControls}
          setShowControls={setShowControls}
          imageFit={imageFit}
          setImageFit={setImageFit}
          onClose={onClose}
          onDelete={onDelete}
          onOpenDetails={onOpenDetails || (() => {})}
          setIsShareOpen={setIsShareOpen || (() => {})}
          downloadingFull={downloadingFull}
          setIsPlaybackActive={setIsPlaybackActive}
        />
      </div>
    );
  }

  // If this slide is a video and is an adjacent slide (for smooth carousel swipe preview)
  if (isVideo && !isCurrent) {
    return (
      <div className="w-full h-full relative flex items-center justify-center bg-black select-none pointer-events-none">
        <img
          src={img.originalUrl || img.url}
          alt="Video preview"
          className={`w-full h-full ${imageFit === 'cover' ? 'object-cover' : 'object-contain'}`}
          draggable={false}
        />

        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-black/60 text-white rounded-full p-4 backdrop-blur-sm border border-white/20">
            <Play className="w-8 h-8 fill-current translate-x-0.5 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Regular photo slide: Google Photos progressive loading architecture
  return (
    <div className="w-full h-full relative flex items-center justify-center bg-black touch-none select-none overflow-hidden">
      <TransformWrapper
        key={`zoom-${img.id}`}
        initialScale={1}
        minScale={1}
        maxScale={6}
        centerOnInit={true}
        centerZoomedOut={true}
        wheel={{ disabled: !isCurrent, step: 0.15 }}
        doubleClick={{ disabled: !isCurrent, mode: 'toggle', step: 2.5 }}
        panning={{ disabled: !isCurrent || !isZoomed, velocityDisabled: false }}
        pinch={{ disabled: !isCurrent, step: 5 }}
        limitToBounds={true}
        disablePadding={true}
        disabled={!isCurrent}
        onInit={(ref) => {
          transformRef.current = ref;
          setTimeout(() => {
            if (ref) ref.centerView(1, 0);
          }, 100);
        }}
        onTransformed={(ref) => {
          if (!isCurrent) return;
          currentScaleRef.current = ref.state.scale;
          const zoomed = ref.state.scale > 1.02;
          if (zoomed !== isZoomed) {
            setIsZoomed(zoomed);
          }
        }}
      >
        <TransformComponent
          wrapperClass="w-full h-full overflow-hidden"
          contentClass="w-full h-full flex items-center justify-center"
          wrapperStyle={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
          contentStyle={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Layer 1: Instant Lightweight Thumbnail / Preview (appears immediately without blank frames) */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt="Preview"
              className={`select-none pointer-events-none transition-opacity duration-300 ${
                isOriginalLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                maxWidth: '100vw',
                maxHeight: '100vh',
                width: imageFit === 'cover' ? '100vw' : 'auto',
                height: imageFit === 'cover' ? '100vh' : 'auto',
                objectFit: imageFit,
                position: isOriginalLoaded ? 'absolute' : 'relative',
              }}
              draggable={false}
            />
          )}

          {/* Layer 2: Decrypted Full Original Image (The genuine final asset in full fidelity) */}
          {hasOriginal && activeOriginalUrl && (
            <img
              id={`lightbox-img-${img.id}`}
              src={activeOriginalUrl}
              alt={isCurrent ? 'Full screen' : 'Preview'}
              className={`select-none ${
                isCurrent && isZoomed
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-default'
              } transition-opacity duration-300 ${
                isOriginalLoaded ? 'opacity-100' : 'opacity-0 absolute'
              }`}
              style={{
                maxWidth: '100vw',
                maxHeight: '100vh',
                width: imageFit === 'cover' ? '100vw' : 'auto',
                height: imageFit === 'cover' ? '100vh' : 'auto',
                objectFit: imageFit,
              }}
              onLoad={() => {
                setIsOriginalLoaded(true);
                if (transformRef.current && currentScaleRef.current <= 1.02) {
                  transformRef.current.centerView(1, 0);
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          )}

          {/* Layer 3: Minimal fallback placeholder if both thumbnail and original are missing */}
          {!thumbnailUrl && !hasOriginal && (
            <div className="flex flex-col items-center justify-center text-zinc-500 space-y-3">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                <span className="text-xs text-zinc-400 font-mono">Vault</span>
              </div>
            </div>
          )}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
