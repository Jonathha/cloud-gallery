import { useState, useEffect } from 'react';
import { isNativeApp } from './isNativeApp';

export const isDesktopDevice = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Native mobile app wrappers (Android/iOS) are always mobile
  if (isNativeApp()) return false;

  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (isMobileUA) return false;

  // Primary pointer is fine (mouse, trackpad)
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    return true;
  }

  // Non-touch device is desktop
  const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints > 0);
  if (!hasTouch) return true;

  // Hybrid laptops / large touch screens
  return window.innerWidth >= 1024;
};

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(isDesktopDevice);

  useEffect(() => {
    const handleCheck = () => {
      setIsDesktop(isDesktopDevice());
    };

    window.addEventListener('resize', handleCheck);
    return () => window.removeEventListener('resize', handleCheck);
  }, []);

  return isDesktop;
}
