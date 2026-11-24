import { LightboxMobileTouchRefs } from './lightboxSlideMobileTypes';

export function createMobileTransformCallbacks(
  refs: LightboxMobileTouchRefs,
  isCurrent: boolean,
  isZoomed: boolean,
  setIsZoomed: (zoomed: boolean) => void
) {
  const handleInit = (ref: any) => {
    refs.transformRef.current = ref;
  };

  const handleTransformed = (ref: any) => {
    if (!isCurrent) return;
    refs.currentScaleRef.current = ref.state.scale;
    const zoomed = ref.state.scale > 1.02;
    if (zoomed !== isZoomed) {
      setIsZoomed(zoomed);
    }
  };

  return { handleInit, handleTransformed };
}
