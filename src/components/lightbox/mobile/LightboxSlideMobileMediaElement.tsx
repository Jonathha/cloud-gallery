import React from 'react';
import { motion } from 'motion/react';
import { DecryptedImage } from '../../../types';
import {
  LIGHTBOX_NO_CLIP,
  LIGHTBOX_TRANSITION,
  getContainBoxStyle,
  measureGridThumbClip,
} from '../lightboxOpenTransition';

interface LightboxSlideMobileMediaElementProps {
  img: DecryptedImage;
  isCurrent: boolean;
  isZoomed: boolean;
  imageFit: 'contain' | 'cover';
  thumbnailUrl: string;
  activeOriginalUrl: string | null;
}

export function LightboxSlideMobileMediaElement({
  img,
  isCurrent,
  isZoomed,
  imageFit,
  thumbnailUrl,
  activeOriginalUrl,
}: LightboxSlideMobileMediaElementProps) {
  const isContain = imageFit !== 'cover';
  // Caixa final com a proporção real: evita o salto miniatura → original.
  const containBox = isContain ? getContainBoxStyle(img.id) : null;
  // Recorte que a célula da grade aplica na foto: animado na abertura e no fechamento.
  const gridClip = React.useMemo(
    () => (isCurrent && containBox ? measureGridThumbClip(img.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCurrent, img.id, !!containBox]
  );

  return (
    <>
      {(activeOriginalUrl || thumbnailUrl) && (
        <motion.img
          layoutId={isCurrent ? `gallery-media-${img.id}` : undefined}
          layoutCrossfade={false}
          transition={LIGHTBOX_TRANSITION}
          initial={gridClip ? { clipPath: gridClip } : false}
          animate={gridClip ? { clipPath: LIGHTBOX_NO_CLIP } : undefined}
          exit={gridClip ? { clipPath: gridClip } : undefined}
          id={`lightbox-img-${img.id}`}
          src={activeOriginalUrl || thumbnailUrl}
          alt={isCurrent ? 'Full screen' : 'Preview'}
          className={`select-none ${
            isCurrent && isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
          style={{
            maxWidth: '100vw',
            maxHeight: '100dvh',
            width: imageFit === 'cover' ? '100vw' : containBox?.width ?? 'auto',
            height: imageFit === 'cover' ? '100dvh' : containBox?.height ?? 'auto',
            objectFit: imageFit,
          }}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
      )}
      {!thumbnailUrl && !activeOriginalUrl && (
        <div className="flex flex-col items-center justify-center text-zinc-500 space-y-3">
          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center animate-pulse">
            <span className="text-xs text-zinc-400 font-mono">Vault</span>
          </div>
        </div>
      )}
    </>
  );
}
