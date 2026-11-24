import React, { useEffect, useRef, useState } from "react";
import { GalleryItemProps, areGalleryItemPropsEqual, isIdSelected } from "./item/types";
import { useGalleryItemObserver } from "../../hooks/gallery/item/useGalleryItemObserver";
import { useGalleryItemTouch } from "../../hooks/gallery/item/useGalleryItemTouch";
import { isGalleryScrolling } from "../../utils/galleryScrollState";
import { GalleryItemContent } from "./item/GalleryItemContent";
import { GalleryItemOverlays } from "./item/GalleryItemOverlays";

const hasMatchMedia = typeof window !== "undefined" && typeof window.matchMedia === "function";
const fineHoverMQ = hasMatchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
const anyHoverMQ = hasMatchMedia ? window.matchMedia("(hover: hover)") : null;

function GalleryItem(props: GalleryItemProps) {
  const {
    img, index, isSelectionMode, setIsSelectionMode, selectedForDeletion, setSelectedForDeletion,
    securityImageId, isExtraUnlocked, extraPassword, handleImageClick, fetchFullMedia, setImageToDelete
  } = props;

  const isSelected = isIdSelected(selectedForDeletion, img.id);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullImageRef = useRef<HTMLImageElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  // Navegadores móveis disparam mouseenter/mousemove "emulados" após um toque; só aceitamos hover real.
  const lastTouchAtRef = useRef(0);
  const canHover = () =>
    !!fineHoverMQ?.matches && Date.now() - lastTouchAtRef.current > 800;
  const [isFullMediaLoaded, setIsFullMediaLoaded] = useState(false);
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);

  const { itemRef, displayUrl, fullMediaUrl, isVisible, aspectRatio, handleMediaLoad, handleImageError } = useGalleryItemObserver({ img, fetchFullMedia });

  useEffect(() => { setIsFullMediaLoaded(false); }, [fullMediaUrl, displayUrl]);
  useEffect(() => { setIsFullImageLoaded(false); }, [fullMediaUrl, img.url]);

  useEffect(() => {
    if (!isHovered) return;
    const handleScroll = () => setIsHovered(false);
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true, once: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [isHovered]);

  const touchHandlers = useGalleryItemTouch({
    imgId: img.id, isSelectionMode, setIsSelectionMode, setSelectedForDeletion,
    onImageClick: (e) => handleImageClick(img, index, e)
  });

  const activeVideoUrl = fullMediaUrl || displayUrl;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !img.isVideo) return;
    const supportsHover = !!anyHoverMQ?.matches;
    const shouldPlay = isVisible && activeVideoUrl.startsWith("blob:") && (!supportsHover || isHovered);
    if (shouldPlay) { video.play().catch(() => {}); } else { video.pause(); if (!isGalleryScrolling()) { video.currentTime = 0; } }
  }, [isVisible, activeVideoUrl, img.isVideo, isHovered]);

  // Piso 0.4 preserva retrato 9:16 (0.56) e prints de celular 9:19.5–9:21 (~0.43–0.46); antes 0.65 os cortava
  const layoutRatio = Math.min(Math.max(aspectRatio || 1, 0.4), 2.15);

  return (
    <div
      ref={itemRef} data-media-id={img.id}
      className={`animate-gallery-item-in bg-zinc-900/80 cursor-pointer group relative overflow-hidden transition-[transform,opacity,border-color,background-color,box-shadow] duration-200 border select-none ${isSelectionMode ? (isSelected ? "scale-[0.92] rounded-xl ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-950/30 z-10" : "scale-[0.96] rounded-lg opacity-60 border-white/[0.04]") : `rounded-md sm:rounded-lg ${isHovered ? "border-white/20 shadow-md" : "border-white/[0.04]"}`}`}
      style={{
        flexGrow: layoutRatio,
        flexBasis: `calc(var(--gallery-row-h, 180px) * ${layoutRatio})`,
        maxHeight: `calc(var(--gallery-row-h, 180px) * 1.45)`,
        height: "auto",
        aspectRatio: `${layoutRatio}`,
        // Referência (cqw/cqh) para a miniatura manter a proporção real dentro do recorte da célula.
        // Seguro: o tamanho da célula vem de flex-basis + aspect-ratio, nunca do conteúdo.
        containerType: "size",
        // Itens fora da tela pulam estilo/layout/pintura do conteúdo; o tamanho da célula não depende dele.
        contentVisibility: "auto",
      }}
      onClick={touchHandlers.handleClick} onTouchStart={(e) => { lastTouchAtRef.current = Date.now(); setIsHovered(false); touchHandlers.handleTouchStart(e); }} onTouchEnd={(e) => { lastTouchAtRef.current = Date.now(); touchHandlers.handleTouchEnd(e); }} onTouchMove={touchHandlers.handleTouchMove} onMouseDown={touchHandlers.handleMouseDown} onMouseUp={touchHandlers.handleMouseUp}
      onMouseEnter={() => { if (canHover() && !isGalleryScrolling()) setIsHovered(true); }} onMouseMove={() => { if (canHover() && !isGalleryScrolling() && !isHovered) setIsHovered(true); }} onMouseLeave={() => { setIsHovered(false); touchHandlers.handleMouseUp(); }} onContextMenu={(e) => { e.preventDefault(); touchHandlers.triggerLongPressSelection(); }}
    >
      <GalleryItemContent img={img} securityImageId={securityImageId} isExtraUnlocked={isExtraUnlocked} extraPassword={extraPassword} isHovered={isHovered} displayUrl={displayUrl} fullMediaUrl={fullMediaUrl} videoRef={videoRef} fullImageRef={fullImageRef} isFullMediaLoaded={isFullMediaLoaded} setIsFullMediaLoaded={setIsFullMediaLoaded} isFullImageLoaded={isFullImageLoaded} setIsFullImageLoaded={setIsFullImageLoaded} handleMediaLoad={handleMediaLoad} handleImageError={handleImageError} />
      <GalleryItemOverlays isSelectionMode={isSelectionMode} isSelected={isSelected} isHovered={isHovered} onDeleteClick={(e) => { e.stopPropagation(); setImageToDelete(img.id); }} />
    </div>
  );
}

const GalleryItemMemoized = React.memo(GalleryItem, areGalleryItemPropsEqual);
export default GalleryItemMemoized;
