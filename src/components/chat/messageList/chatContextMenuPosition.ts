const GAP = 6;
const EDGE = 8;

export interface MenuPosition {
  top: number;
  left: number;
}

/** Posiciona abaixo da mensagem; acima se não couber; respeita bordas e teclado (visualViewport). */
export function computeMenuPosition(
  anchor: DOMRect,
  menuWidth: number,
  menuHeight: number,
  alignRight: boolean
): MenuPosition | null {
  const vv = window.visualViewport;
  const vpTop = vv ? vv.offsetTop : 0;
  const vpHeight = vv ? vv.height : window.innerHeight;
  const vpWidth = window.innerWidth;

  // Mensagem fora da área visível: o menu não deve ficar flutuando
  if (anchor.bottom < vpTop || anchor.top > vpTop + vpHeight) return null;

  const below = anchor.bottom + GAP;
  const fitsBelow = vpTop + vpHeight - below - EDGE >= menuHeight;
  const top = fitsBelow ? below : Math.max(vpTop + EDGE, anchor.top - GAP - menuHeight);

  const rawLeft = alignRight ? anchor.right - menuWidth : anchor.left;
  const left = Math.min(Math.max(EDGE, rawLeft), vpWidth - menuWidth - EDGE);

  return { top, left };
}
