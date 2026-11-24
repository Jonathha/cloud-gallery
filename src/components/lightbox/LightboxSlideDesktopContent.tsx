import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { DecryptedImage } from '../../types';
import { getImageObjectURL } from '../../utils/fileCrypto';
import DesktopZoomFloatingBar from './desktop/DesktopZoomFloatingBar';
import DesktopKeyboardZoomListener from './desktop/DesktopKeyboardZoomListener';
import DesktopVideoSlide from './desktop/DesktopVideoSlide';
import {
  LIGHTBOX_NO_CLIP,
  LIGHTBOX_TRANSITION,
  getContainBoxStyle,
  measureGridThumbClip,
} from './lightboxOpenTransition';

export interface LightboxSlideDesktopContentProps {
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

/**
 * PC / Desktop-specific Lightbox Slide Component
 * Features smooth wheel zoom, zero-momentum direct mouse panning,
 * dedicated desktop zoom buttons, keyboard shortcuts (+ / - / 0), and drag conflict protection.
 */
export function LightboxSlideDesktopContent({
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
}: LightboxSlideDesktopContentProps) {
  const currentScaleRef = useRef(1);
  const [currentScale, setCurrentScale] = useState(1);
  const transformRef = useRef<any>(null);

  // Mouse pan detection to prevent toggling controls on drag release
  const pointerStartPos = useRef({ x: 0, y: 0 });
  const didMoveSignificantly = useRef(false);

  const isVideo = img.isVideo || img.contentType?.startsWith('video/') || false;

  // Resolve thumbnail preview URL
  const thumbnailUrl = img.url || '';

  // Resolve high-resolution original URL
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

  // Caixa final com a proporção real (modo contain): evita o salto miniatura → original.
  const containBox = !isVideo && imageFit !== 'cover' ? getContainBoxStyle(img.id) : null;
  // Recorte que a célula da grade aplica na foto: animado na abertura e no fechamento.
  const gridClip = React.useMemo(
    () => (isCurrent && containBox ? measureGridThumbClip(img.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCurrent, img.id, !!containBox]
  );

  // Se o original chega durante a animação de abertura, a troca do src (decode + upload da
  // imagem grande) acontece no meio do movimento e causa a leve travada. Segura a troca até o fim.
  const hadOriginalAtMount = useRef(!!activeOriginalUrl);
  const [openDone, setOpenDone] = useState(!gridClip);
  useEffect(() => {
    if (openDone) return;
    const t = setTimeout(() => setOpenDone(true), 400);
    return () => clearTimeout(t);
  }, [openDone]);
  const holdOriginal = !openDone && !hadOriginalAtMount.current;

  // If this slide is a video
  if (isVideo) {
    return (
      <DesktopVideoSlide
        img={img}
        isCurrent={isCurrent}
        selectedImage={selectedImage}
        downloadingFull={downloadingFull}
        imageFit={imageFit}
        setImageFit={setImageFit}
        showControls={showControls}
        setShowControls={setShowControls}
        onClose={onClose}
        onDelete={onDelete}
        onOpenDetails={onOpenDetails}
        setIsShareOpen={setIsShareOpen}
        setIsPlaybackActive={setIsPlaybackActive}
      />
    );
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    didMoveSignificantly.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dist = Math.hypot(
      e.clientX - pointerStartPos.current.x,
      e.clientY - pointerStartPos.current.y
    );
    if (dist > 6) {
      didMoveSignificantly.current = true;
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    // If the user was dragging/panning the image, prevent bubbling to touch surface
    if (didMoveSignificantly.current) {
      e.stopPropagation();
      didMoveSignificantly.current = false;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Prevent double-click from toggling controls bars on PC
    e.stopPropagation();
  };

  return (
    <div
      className="w-full h-full relative flex items-center justify-center bg-transparent select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClickCapture={handleClickCapture}
      onDoubleClick={handleDoubleClick}
    >
      <TransformWrapper
        key={`desktop-zoom-${img.id}`}
        initialScale={1}
        minScale={1}
        maxScale={8}
        centerOnInit={true}
        centerZoomedOut={true}
        smooth={true}
        wheel={{
          disabled: !isCurrent,
          step: 0.25,
          smoothStep: 0.002,
        }}
        doubleClick={{
          disabled: !isCurrent,
          mode: 'toggle',
          step: 2.5,
          animationTime: 220,
          animationType: 'easeOut',
        }}
        panning={{
          disabled: !isCurrent || !isZoomed,
          velocityDisabled: true, // No erratic inertia when releasing mouse on PC
        }}
        pinch={{ disabled: true }}
        limitToBounds={true}
        disablePadding={true}
        disabled={!isCurrent}
        onInit={(ref) => {
          transformRef.current = ref;
        }}
        onTransformed={(ref) => {
          if (!isCurrent) return;
          const scale = ref.state.scale;
          currentScaleRef.current = scale;
          const zoomed = scale > 1.02;
          if (zoomed !== isZoomed) {
            setIsZoomed(zoomed);
          }
          setCurrentScale(scale);
        }}
      >
        {isCurrent && <DesktopKeyboardZoomListener isCurrent={isCurrent} />}

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
          {/* Main Displayed Media */}
          {(activeOriginalUrl || thumbnailUrl) && (
            <motion.img
              layoutId={isCurrent ? `gallery-media-${img.id}` : undefined}
              layoutCrossfade={false}
              transition={LIGHTBOX_TRANSITION}
              initial={gridClip ? { clipPath: gridClip } : false}
              animate={gridClip ? { clipPath: LIGHTBOX_NO_CLIP } : undefined}
              exit={gridClip ? { clipPath: gridClip } : undefined}
              onAnimationComplete={() => setOpenDone(true)}
              id={`lightbox-img-desktop-${img.id}`}
              src={holdOriginal ? thumbnailUrl || activeOriginalUrl || undefined : activeOriginalUrl || thumbnailUrl}
              alt={isCurrent ? 'Full screen' : 'Preview'}
              className={`select-none ${
                isCurrent && isZoomed
                  ? 'cursor-grab active:cursor-grabbing'
                  : 'cursor-zoom-in'
              }`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: imageFit === 'cover' ? '100%' : containBox?.width ?? 'auto',
                height: imageFit === 'cover' ? '100%' : containBox?.height ?? 'auto',
                objectFit: imageFit,
              }}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          )}

          {/* Fallback placeholder */}
          {!thumbnailUrl && !activeOriginalUrl && (
            <div className="flex flex-col items-center justify-center text-zinc-500 space-y-3">
              <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
                <span className="text-xs text-zinc-400 font-mono">Vault</span>
              </div>
            </div>
          )}
        </TransformComponent>

        {/* Floating Zoom Bar for PC */}
        {isCurrent && (
          <DesktopZoomFloatingBar
            scale={currentScale}
            showControls={showControls}
          />
        )}
      </TransformWrapper>
    </div>
  );
}

export default LightboxSlideDesktopContent;
