import { Lock, Film, Image as ImageIcon, Play, Check, Trash2, Shield } from "lucide-react";
import React from "react";
import { motion } from "motion/react";
import { DecryptedImage } from "../types";
import { useGalleryItemObserver } from "../hooks/gallery/item/useGalleryItemObserver";
import { useGalleryItemTouch } from "../hooks/gallery/item/useGalleryItemTouch";

interface GalleryItemProps {
  key?: string;
  img: DecryptedImage;
  index: number;
  isSelectionMode: boolean;
  setIsSelectionMode?: (mode: boolean) => void;
  selectedForDeletion: string[];
  setSelectedForDeletion?: (val: string[] | ((prev: string[]) => string[])) => void;
  securityImageId: string | null;
  isExtraUnlocked: boolean;
  extraPassword: string | null;
  hideProtectButton?: boolean;
  handleImageClick: (img: DecryptedImage, index: number, e: React.MouseEvent) => Promise<void> | void;
  fetchFullMedia: (img: DecryptedImage, isPreload?: boolean) => Promise<void>;
  setImageToDelete: (id: string | null) => void;
  setImageToProtect?: (id: string | null) => void;
}

export default function GalleryItem({
  img, index, isSelectionMode, setIsSelectionMode, selectedForDeletion, setSelectedForDeletion,
  securityImageId, isExtraUnlocked, extraPassword, hideProtectButton,
  handleImageClick, fetchFullMedia, setImageToDelete, setImageToProtect,
}: GalleryItemProps) {
  const isSelected = selectedForDeletion.includes(img.id);

  const { itemRef, displayUrl, aspectRatio, handleImageLoad, handleImageError } = useGalleryItemObserver({
    img, fetchFullMedia
  });

  const touchHandlers = useGalleryItemTouch({
    imgId: img.id, isSelectionMode, setIsSelectionMode, setSelectedForDeletion,
    onImageClick: (e) => handleImageClick(img, index, e)
  });

  return (
    <motion.div
      ref={itemRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-zinc-900/80 cursor-pointer group relative overflow-hidden transition-all duration-200 border select-none ${
        isSelectionMode
          ? isSelected
            ? "scale-[0.92] rounded-xl ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-950/30 z-10"
            : "scale-[0.96] rounded-lg opacity-60 border-white/[0.04]"
          : "rounded-md sm:rounded-lg border-white/[0.04] hover:border-white/20 hover:shadow-md"
      }`}
      style={{
        flexGrow: aspectRatio, flexBasis: `${aspectRatio * 160}px`,
        height: "max(120px, 20vh)", maxHeight: "300px",
      }}
      onClick={touchHandlers.handleClick}
      onTouchStart={touchHandlers.handleTouchStart}
      onTouchEnd={touchHandlers.handleTouchEnd}
      onTouchMove={touchHandlers.handleTouchMove}
      onMouseDown={touchHandlers.handleMouseDown}
      onMouseUp={touchHandlers.handleMouseUp}
      onMouseLeave={touchHandlers.handleMouseUp}
      onContextMenu={(e) => { e.preventDefault(); touchHandlers.triggerLongPressSelection(); }}
    >
      {img.failed ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 p-2 text-center bg-zinc-950/40">
          <Lock size={20} className="mb-1 opacity-40 text-zinc-500" />
          <span className="text-[9px] font-mono font-medium uppercase tracking-wider text-zinc-500">Erro</span>
        </div>
      ) : img.id === securityImageId && !isExtraUnlocked && extraPassword ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950/60 text-zinc-400 group-hover:text-zinc-200 transition-colors">
          <div className="p-2.5 rounded-full bg-white/[0.04] border border-white/5 mb-1.5">
            <Lock size={20} className="text-zinc-400" strokeWidth={1.75} />
          </div>
          <span className="text-[9px] font-medium tracking-wider uppercase text-zinc-500">Protegida</span>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-zinc-900/40">
          {img.noThumbnail ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
              {img.isVideo ? <Film size={26} className="opacity-40 mb-1" /> : <ImageIcon size={26} className="opacity-40 mb-1" />}
              <span className="text-[9px] font-mono tracking-wider opacity-60 uppercase">{img.isVideo ? "Vídeo" : "Imagem"}</span>
            </div>
          ) : (
            <img
              src={displayUrl} alt="" loading="lazy" decoding="async"
              className="w-full h-full object-cover transition-all duration-500 group-hover:brightness-95 select-none"
              style={{ display: "block" }} referrerPolicy="no-referrer" draggable={false}
              onContextMenu={(e) => e.preventDefault()} onLoad={handleImageLoad} onError={handleImageError}
            />
          )}
          {img.isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
              <div className="p-2 bg-black/50 backdrop-blur-md text-white rounded-full transition-transform duration-200 group-hover:scale-110 shadow-sm">
                <Play size={12} fill="currentColor" className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" />
              </div>
            </div>
          )}
        </div>
      )}
      {isSelectionMode && (
        <div className="absolute inset-0 z-10 flex items-start justify-start p-1.5 sm:p-2 pointer-events-none">
          <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center shadow-md ${isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-white/70 bg-black/40 backdrop-blur-sm"}`}>
            {isSelected && <Check size={13} strokeWidth={3} />}
          </div>
        </div>
      )}
      {!isSelectionMode && (
        <div className="absolute top-1.5 right-1.5 transition-opacity duration-150 z-20 flex gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
          {extraPassword && !hideProtectButton && (
            <button onClick={(e) => { e.stopPropagation(); setImageToProtect?.(img.id); }} className="p-1.5 bg-black/60 hover:bg-emerald-500/90 text-zinc-200 hover:text-white rounded-md backdrop-blur-md transition-all border border-white/10" title="Proteger">
              <Shield size={13} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setImageToDelete(img.id); }} className="p-1.5 bg-black/60 hover:bg-red-500/90 text-zinc-200 hover:text-white rounded-md backdrop-blur-md transition-all border border-white/10" title="Excluir">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
