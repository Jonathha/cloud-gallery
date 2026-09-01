/**
 * Dimensões e cálculos geométricos da esteira da roleta.
 */

export function getRouletteDimensions() {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const cardWidth = isMobile ? 108 : 128;
  const gap = isMobile ? 10 : 12;
  const step = cardWidth + gap;
  const padding = 16;

  return {
    isMobile,
    cardWidth,
    gap,
    step,
    padding,
  };
}

export function calculateCardCenter(index: number): number {
  const { cardWidth, step, padding } = getRouletteDimensions();
  return padding + index * step + cardWidth / 2;
}
