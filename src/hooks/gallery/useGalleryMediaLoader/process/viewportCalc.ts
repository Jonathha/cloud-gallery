export function calculateViewportItemsCount(): number {
  if (typeof window === "undefined") return 32;
  const width = window.innerWidth;
  const height = window.innerHeight;
  let cols = 4;
  if (width >= 1280) cols = 10;
  else if (width >= 1024) cols = 8;
  else if (width >= 768) cols = 6;
  else if (width >= 640) cols = 5;

  const itemSize = Math.min(width, 1280) / cols;
  const visibleHeight = Math.max(height - (width < 768 ? 100 : 200), 300);
  const rows = Math.ceil(visibleHeight / itemSize) + 2;
  return Math.max(rows * cols, 24);
}
