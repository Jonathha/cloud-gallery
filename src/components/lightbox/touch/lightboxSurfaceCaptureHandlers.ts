import React from 'react';
import { LightboxTouchRefs } from './lightboxTouchSurfaceTypes';

export type FreeSide = 'left' | 'right';

export interface SurfaceSideNav {
  enabled: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const SIDE_NAV_BLOCKED =
  'button, a, input, select, textarea, video, [role="slider"], #lightbox-desktop-zoom-bar';

const SIDE_EDGE_ZONE = 96;

/** Retorna a lateral livre (fora da mídia atual) sob o mouse, ou null. */
export function getFreeSide(
  target: EventTarget | null,
  clientX: number,
  container: HTMLElement | null
): FreeSide | null {
  if (!container) return null;
  if (target instanceof Element && target.closest(SIDE_NAV_BLOCKED)) return null;
  const c = container.getBoundingClientRect();
  const cx = c.left + c.width / 2;
  const medias = container.querySelectorAll('#lightbox-slide-track img, #lightbox-slide-track video');
  for (let i = 0; i < medias.length; i++) {
    const r = medias[i].getBoundingClientRect();
    if (r.width > 0 && r.left <= cx && r.right >= cx) {
      if (clientX < r.left) return 'left';
      if (clientX > r.right) return 'right';
      // Foto larga que encosta nas bordas: sem lateral livre, usa uma zona de borda.
      if (clientX - c.left < SIDE_EDGE_ZONE) return 'left';
      if (c.right - clientX < SIDE_EDGE_ZONE) return 'right';
      return null;
    }
  }
  return null;
}

export function createSurfaceCaptureHandlers(
  refs: LightboxTouchRefs,
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void,
  sideNav?: SurfaceSideNav
) {
  const { isDraggingRef, isAnimatingRef, x, targetBaseXRef, activePointerIdRef } = refs;

  const isTrackMoving = () =>
    isDraggingRef.current || isAnimatingRef.current || Math.abs(x.get() - targetBaseXRef.current) > 2;

  const handleControlsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTrackMoving()) return;
    if (sideNav?.enabled) {
      const side = getFreeSide(e.target, e.clientX, refs.containerRef.current);
      if (side === 'left' && sideNav.hasPrev) {
        sideNav.onPrev();
        return;
      }
      if (side === 'right' && sideNav.hasNext) {
        sideNav.onNext();
        return;
      }
    }
    setShowControls((prev) => !prev);
  };

  const handlePointerDownCapture = (e: React.PointerEvent) => {
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) {
      if (isTrackMoving()) e.stopPropagation();
    }
  };

  const handleTouchStartCapture = (e: React.TouchEvent) => {
    if (e.touches.length > 1 && isTrackMoving()) e.stopPropagation();
  };

  const handleTouchMoveCapture = (e: React.TouchEvent) => {
    if (e.touches.length > 1 && isTrackMoving()) e.stopPropagation();
  };

  return {
    handleControlsClick,
    handlePointerDownCapture,
    handleTouchStartCapture,
    handleTouchMoveCapture,
  };
}
