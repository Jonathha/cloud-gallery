import { getCachedAspectRatio, getCachedMediaDimensions } from '../../utils/aspectRatioCache';

/** Mesma curva/duração já usadas na transição da galeria. */
export const LIGHTBOX_TRANSITION = { duration: 0.32, ease: [0.2, 0, 0, 1] as const };

/** Recorte "nenhum" — mesma estrutura do recorte inicial para permitir interpolação. */
export const LIGHTBOX_NO_CLIP = 'inset(0% 0% 0% 0%)';

/** Atributo que identifica a miniatura de origem na grade. */
export const GALLERY_THUMB_ATTR = 'data-gallery-thumb';

export function getValidAspectRatio(id: string): number | undefined {
  const r = getCachedAspectRatio(id);
  return r !== undefined && r > 0.05 && r < 20 ? r : undefined;
}

/**
 * Caixa final do visualizador no modo "contain" com a proporção real da foto.
 * Assim o tamanho não depende de qual arquivo (miniatura ou original) está carregado,
 * e a animação de abertura termina exatamente no tamanho final, sem salto posterior.
 * Usa as mesmas unidades de viewport já usadas pelo visualizador e não amplia além
 * das dimensões originais quando elas são conhecidas.
 */
export function getContainBoxStyle(id: string): { width: string; height: string } | null {
  const r = getValidAspectRatio(id);
  if (!r) return null;
  const dims = getCachedMediaDimensions(id);
  const dimsMatch = dims && Math.abs(dims.width / dims.height - r) / r < 0.02;
  const capW = dimsMatch ? `, ${dims!.width}px` : '';
  const capH = dimsMatch ? `, ${dims!.height}px` : '';
  return {
    width: `min(100vw, calc(100dvh * ${r})${capW})`,
    height: `min(100dvh, calc(100vw / ${r})${capH})`,
  };
}

/**
 * Mede quanto da foto está recortado pela célula da grade (object-cover), em % da
 * própria foto. Retorna null quando não há recorte ou a miniatura não está no DOM.
 */
export function measureGridThumbClip(id: string): string | null {
  if (typeof document === 'undefined') return null;
  const safeId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id;
  const thumb = document.querySelector<HTMLElement>(`[${GALLERY_THUMB_ATTR}="${safeId}"]`);
  const frame = thumb?.parentElement;
  if (!thumb || !frame) return null;
  const t = thumb.getBoundingClientRect();
  const f = frame.getBoundingClientRect();
  if (t.width < 1 || t.height < 1) return null;
  const pct = (v: number, size: number) => Math.min(49, Math.max(0, (v / size) * 100));
  const top = pct(f.top - t.top, t.height);
  const right = pct(t.right - f.right, t.width);
  const bottom = pct(t.bottom - f.bottom, t.height);
  const left = pct(f.left - t.left, t.width);
  if (top + right + bottom + left < 0.5) return null;
  const r2 = (n: number) => `${Math.round(n * 100) / 100}%`;
  return `inset(${r2(top)} ${r2(right)} ${r2(bottom)} ${r2(left)})`;
}
