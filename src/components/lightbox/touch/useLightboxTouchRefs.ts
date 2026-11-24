import { useRef } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { LightboxTouchRefs, LightboxTouchSurfaceProps } from './lightboxTouchSurfaceTypes';

export function useLightboxTouchState(
  props: LightboxTouchSurfaceProps,
  containerWidth: number
) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lastValidIdRef = useRef(props.selectedImageId);
  if (props.selectedImageId) {
    lastValidIdRef.current = props.selectedImageId;
  }
  const effectiveImageId = props.selectedImageId || lastValidIdRef.current;

  const currentIndex = props.images.findIndex((img) => img.id === effectiveImageId);
  const currentItem = props.images[currentIndex] || props.images[0];
  const isCurrentVideo =
    props.selectedImageIsVideo ||
    currentItem?.isVideo ||
    currentItem?.contentType?.startsWith('video/') ||
    false;

  const baseX = -currentIndex * (containerWidth + 40);
  const x = useMotionValue(-currentIndex * (containerWidth + 40));
  const lastIndex = useRef(currentIndex);
  const currentIndexRef = useRef(currentIndex);
  const targetBaseXRef = useRef(baseX);
  const isAnimatingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const activeAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

  const refs: LightboxTouchRefs = {
    touchStartX,
    touchStartY,
    containerRef,
    lastValidIdRef,
    lastIndex,
    currentIndexRef,
    targetBaseXRef,
    isAnimatingRef,
    isDraggingRef,
    activePointerIdRef,
    activeAnimationRef,
    x,
  };

  return { refs, currentIndex, isCurrentVideo, baseX };
}
