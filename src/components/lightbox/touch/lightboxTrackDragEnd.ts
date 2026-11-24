import { DecryptedImage } from '../../../types';
import { LightboxTouchRefs } from './lightboxTouchSurfaceTypes';

interface DragEndParams {
  refs: LightboxTouchRefs;
  images: DecryptedImage[];
  currentIndex: number;
  containerWidth: number;
  baseX: number;
  isZoomed: boolean;
  isPlaybackActive: boolean;
  animateToBase: (targetX: number, customDuration?: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function createDragEnd(params: DragEndParams) {
  const {
    refs,
    images,
    currentIndex,
    containerWidth,
    baseX,
    isZoomed,
    isPlaybackActive,
    animateToBase,
    onNext,
    onPrev,
  } = params;

  return (_event: any, info: any) => {
    refs.isDraggingRef.current = false;
    refs.activePointerIdRef.current = null;
    if (isZoomed || isPlaybackActive) return;

    const threshold = containerWidth * 0.2;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    if (offset < -threshold || (offset < -40 && velocity < -150)) {
      const nextImg = images[currentIndex + 1];
      if (currentIndex < images.length - 1 && nextImg && !nextImg.failed && !nextImg.isMissing) {
        const nextIndex = currentIndex + 1;
        refs.lastIndex.current = nextIndex;
        animateToBase(-nextIndex * (containerWidth + 40));
        onNext();
      } else {
        animateToBase(baseX);
      }
    } else if (offset > threshold || (offset > 40 && velocity > 150)) {
      const prevImg = images[currentIndex - 1];
      if (currentIndex > 0 && prevImg && !prevImg.failed && !prevImg.isMissing) {
        const prevIndex = currentIndex - 1;
        refs.lastIndex.current = prevIndex;
        animateToBase(-prevIndex * (containerWidth + 40));
        onPrev();
      } else {
        animateToBase(baseX);
      }
    } else {
      animateToBase(baseX);
    }
  };
}
