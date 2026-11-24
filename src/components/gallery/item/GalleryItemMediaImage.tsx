import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { DecryptedImage } from '../../../types';
import { saveMediaDimensions } from '../../../utils/aspectRatioCache';
import { GALLERY_THUMB_ATTR, getValidAspectRatio } from '../../lightbox/lightboxOpenTransition';

const revealedThumbs = new Set<string>();

interface GalleryItemMediaImageProps {
  img: DecryptedImage;
  fullMediaUrl: string | null;
  fullImageRef: React.RefObject<HTMLImageElement | null>;
  isHovered: boolean;
  isFullImageLoaded: boolean;
  setIsFullImageLoaded: (val: boolean) => void;
  handleMediaLoad: (e: any) => void;
  handleImageError: (e: any) => void;
}

export const GalleryItemMediaImage: React.FC<GalleryItemMediaImageProps> = ({
  img, fullMediaUrl, fullImageRef, isHovered,
  isFullImageLoaded, setIsFullImageLoaded, handleMediaLoad, handleImageError
}) => {
  // A miniatura compartilhada (layoutId) mantém a proporção real da foto e é recortada
  // pela célula (overflow-hidden), com o mesmo resultado visual do object-cover.
  // Assim a transição até o visualizador só escala de forma uniforme, sem esticar.
  // Sem suporte a container queries, os valores são ignorados e vale w-full/h-full.
  // A miniatura só aparece (fade) depois de decodificada: evita o cinza/piscada da célula.
  // Ids já revelados nesta sessão voltam visíveis na hora, sem repetir a animação ao rolar.
  const thumbRef = useRef<HTMLImageElement>(null);
  const [thumbReady, setThumbReady] = useState(() => revealedThumbs.has(img.id));
  const revealThumb = () => { revealedThumbs.add(img.id); setThumbReady(true); };
  const revealAfterDecode = (el: HTMLImageElement) => {
    if ('decode' in el) el.decode().then(revealThumb, revealThumb);
    else revealThumb();
  };
  useEffect(() => {
    if (thumbReady) return;
    const el = thumbRef.current;
    // Imagem já em cache do navegador pode estar pronta antes do onLoad ser ligado
    if (el && el.complete && el.naturalWidth) revealAfterDecode(el);
  }, [img.url, thumbReady]);

  const ratio = getValidAspectRatio(img.id);
  const coverW = ratio ? `max(100cqw, calc(100cqh * ${ratio}))` : undefined;
  const coverH = ratio ? `max(100cqh, calc(100cqw / ${ratio}))` : undefined;
  const thumbStyle: React.CSSProperties = ratio
    ? {
        display: 'block',
        position: 'absolute',
        width: coverW,
        height: coverH,
        left: `calc(50% - ${coverW} / 2)`,
        top: `calc(50% - ${coverH} / 2)`,
        maxWidth: 'none',
        maxHeight: 'none',
      }
    : { display: 'block' };

  return (
    <>
      <motion.img
        ref={thumbRef}
        layoutId={`gallery-media-${img.id}`}
        initial={false}
        animate={{ opacity: thumbReady ? 1 : 0 }}
        transition={{ duration: 0.32, ease: [0.2, 0, 0, 1], opacity: { duration: 0.22, ease: 'easeOut' } }}
        {...{ [GALLERY_THUMB_ATTR]: img.id }}
        src={img.url} alt="" decoding="async"
        className={`w-full h-full object-cover select-none transition-[filter] duration-200 ${isHovered ? 'brightness-95' : ''}`}
        style={thumbStyle} referrerPolicy="no-referrer" draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onLoad={(e) => { handleMediaLoad(e); revealAfterDecode(e.currentTarget); }}
        onError={(e) => { handleImageError(e); revealThumb(); }}
      />
      {fullMediaUrl && fullMediaUrl !== img.url && (
        <img
          ref={fullImageRef} src={fullMediaUrl} alt="" decoding="async"
          className={`absolute inset-0 w-full h-full object-cover select-none transition-opacity duration-300 pointer-events-none ${isHovered ? 'brightness-95' : ''} ${isFullImageLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ display: 'block' }} referrerPolicy="no-referrer" draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onLoad={(e) => {
            handleMediaLoad(e);
            const target = e.currentTarget;
            if (target.naturalWidth && target.naturalHeight) {
              saveMediaDimensions(img.id, target.naturalWidth, target.naturalHeight);
            }
            if ('decode' in target) {
              target.decode().then(() => setIsFullImageLoaded(true)).catch(() => setIsFullImageLoaded(true));
            } else {
              setIsFullImageLoaded(true);
            }
          }}
          onError={handleImageError}
        />
      )}
    </>
  );
};
