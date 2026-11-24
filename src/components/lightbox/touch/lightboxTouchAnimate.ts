import { animate } from 'motion/react';
import { LightboxTouchRefs } from './lightboxTouchSurfaceTypes';

export const transitionConfig = { ease: [0.32, 0.72, 0, 1] as const, duration: 0.28 };

export function createAnimateToBase(refs: LightboxTouchRefs) {
  const { targetBaseXRef, activeAnimationRef, x, isAnimatingRef } = refs;

  return (targetX: number, customDuration?: number) => {
    targetBaseXRef.current = targetX;
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop();
    }
    if (Math.abs(x.get() - targetX) <= 0.5) {
      x.set(targetX);
      isAnimatingRef.current = false;
      activeAnimationRef.current = null;
      return;
    }
    isAnimatingRef.current = true;
    const controls = animate(x, targetX, {
      ease: transitionConfig.ease,
      duration: customDuration ?? transitionConfig.duration,
      onComplete: () => {
        if (activeAnimationRef.current === controls) {
          isAnimatingRef.current = false;
          activeAnimationRef.current = null;
        }
      },
    });
    activeAnimationRef.current = controls;
  };
}
