import React from 'react';
import { motion } from 'motion/react';
import { Film, Image as ImageIcon, Lock } from 'lucide-react';

interface TrashGridProps {
  images: any[];
  selectedIds: string[];
  handleSelectImage: (img: any) => void;
  onLongPress: (id: string) => void;
  securityImageId: string | null;
  isExtraUnlocked: boolean;
  extraPassword: string | null;
}

const LONG_PRESS_MS = 450;

interface TrashGridItemProps {
  img: any;
  isSelected: boolean;
  showHover: boolean;
  locked: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}

function TrashGridItem({
  img,
  isSelected,
  showHover,
  locked,
  onSelect,
  onLongPress,
}: TrashGridItemProps) {
  const timerRef = React.useRef<number | undefined>(undefined);
  const suppressClickRef = React.useRef(false);
  const startPosRef = React.useRef({ x: 0, y: 0 });

  const clearTimer = React.useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  React.useEffect(() => clearTimer, [clearTimer]);

  const startLongPress = (e: React.PointerEvent) => {
    // Mouse usa clique direito (onContextMenu); toque usa long press
    if (e.pointerType === 'mouse') return;
    clearTimer();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = window.setTimeout(() => {
      timerRef.current = undefined;
      suppressClickRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (timerRef.current === undefined) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    // Cancelar se o dedo deslizou (scroll) em vez de pressionar
    if (Math.hypot(dx, dy) > 8) clearTimer();
  };

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelect();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onLongPress();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={img.isVideo ? 'Vídeo na lixeira' : 'Imagem na lixeira'}
      className={`aspect-[4/5] sm:aspect-square bg-zinc-900 cursor-pointer group relative overflow-hidden rounded-2xl shadow-lg ring-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
        isSelected ? 'ring-emerald-400 ring-2' : 'ring-white/10 hover:ring-white/30'
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onPointerDown={startLongPress}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
    >
      {/* Selection Overlay */}
      <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
        isSelected ? 'bg-emerald-400 border-emerald-400' : 'bg-black/20 border-white/40'
      }`}>
        {isSelected && <div className="w-2.5 h-2.5 bg-zinc-950 rounded-full" />}
      </div>

      {locked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950 p-4 text-center select-none">
          <Lock size={28} className="text-zinc-600 mb-2 animate-pulse" strokeWidth={1.5} />
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
            Protegido
          </span>
        </div>
      ) : img.noThumbnail ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 group-hover:brightness-50 transition-all bg-zinc-950">
          {img.isVideo ? (
            <Film size={32} className="opacity-40 mb-1" strokeWidth={1.5} />
          ) : (
            <ImageIcon size={32} className="opacity-40 mb-1" strokeWidth={1.5} />
          )}
          <span className="text-[9px] font-mono tracking-wider opacity-65 uppercase">
            {img.isVideo ? 'Vídeo' : 'Imagem'}
          </span>
        </div>
      ) : (
        <img
          src={img.url}
          alt=""
          className={`w-full h-full object-cover transition-all duration-500 select-none ${isSelected ? 'brightness-75 scale-95' : 'group-hover:brightness-50'}`}
          draggable={false}
        />
      )}

      {/* Hover Overlay */}
      {showHover && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
          <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded-md backdrop-blur-md">
            Ver Opções
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function TrashGrid({
  images,
  selectedIds,
  handleSelectImage,
  onLongPress,
  securityImageId,
  isExtraUnlocked,
  extraPassword,
}: TrashGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 sm:gap-4">
      {images.map((img) => {
        const isSelected = selectedIds.includes(img.id);
        const locked = img.id === securityImageId && !isExtraUnlocked && !!extraPassword;
        return (
          <TrashGridItem
            key={img.id}
            img={img}
            isSelected={isSelected}
            showHover={selectedIds.length === 0}
            locked={locked}
            onSelect={() => handleSelectImage(img)}
            onLongPress={() => onLongPress(img.id)}
          />
        );
      })}
    </div>
  );
}
