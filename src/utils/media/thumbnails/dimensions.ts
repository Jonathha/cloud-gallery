// A grade fixa a ALTURA das linhas (--gallery-row-h: 118/152/188px, limitada a 1.45x => até ~171px no
// celular e ~272px no desktop). Em DPR 3 (celular) e DPR 2 (desktop) isso dá ~513–546px físicos, então a
// miniatura é dimensionada pela altura exibida — antes o lado MAIOR era limitado a 480px e fotos
// horizontais ficavam com só 270–360px de altura (borradas, forçando o carregamento do original).
// A largura é limitada para panorâmicas (a grade corta acima de ~2.15:1 de qualquer forma).
const THUMB_TARGET_HEIGHT = 548;
const THUMB_MAX_WIDTH = 1280;

export function calculateThumbDimensions(w: number, h: number) {
  if (!(w > 0) || !(h > 0)) return { width: w, height: h };
  const scale = Math.min(1, THUMB_TARGET_HEIGHT / h, THUMB_MAX_WIDTH / w);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}
