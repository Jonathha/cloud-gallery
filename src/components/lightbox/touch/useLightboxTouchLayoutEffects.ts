import { useEffect } from 'react';
import { LightboxTouchRefs } from './lightboxTouchSurfaceTypes';

export function useLightboxTouchLayoutEffects(
  refs: LightboxTouchRefs,
  currentIndex: number,
  baseX: number,
  setContainerWidth: (w: number) => void,
  animateToBase: (targetX: number, customDuration?: number) => void
) {
  const { currentIndexRef, containerRef, targetBaseXRef, lastIndex, x } = refs;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const width = containerRef.current?.clientWidth || window.innerWidth;
    setContainerWidth(width);
    const initialX = -currentIndexRef.current * (width + 40);
    targetBaseXRef.current = initialX;
    x.set(initialX);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth;
      setContainerWidth(width);
      const resizedX = -currentIndexRef.current * (width + 40);
      targetBaseXRef.current = resizedX;
      x.set(resizedX);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [x]);

  useEffect(() => {
    targetBaseXRef.current = baseX;
    if (currentIndex !== -1 && currentIndex !== lastIndex.current) {
      lastIndex.current = currentIndex;
      animateToBase(baseX);
    }
  }, [currentIndex, baseX, x]);
}
