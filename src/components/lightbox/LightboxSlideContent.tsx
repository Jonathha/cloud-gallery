import React from 'react';
import { LightboxSlideMobileContent } from './LightboxSlideMobileContent';
import { LightboxSlideDesktopContent } from './LightboxSlideDesktopContent';
import { useIsDesktop } from '../../utils/deviceType';
import { LightboxSlideContentProps } from './lightboxSlideContentTypes';

export type { LightboxSlideContentProps };

/**
 * Multi-platform router for Lightbox Slide Content:
 * - PC / Desktop: Uses LightboxSlideDesktopContent with dedicated smooth wheel zoom,
 *   direct zero-inertia mouse panning, desktop zoom buttons, and keyboard controls.
 * - Mobile: Uses LightboxSlideMobileContent with the exact original touch pinch, swipe,
 *   and tap gestures completely untouched.
 */
export function LightboxSlideContent(props: LightboxSlideContentProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return <LightboxSlideDesktopContent {...props} />;
  }

  return <LightboxSlideMobileContent {...props} />;
}

