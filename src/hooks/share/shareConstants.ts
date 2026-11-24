/** Maximum number of simultaneously active links per media (enforced by the server). */
export const MAX_SHARE_LINKS = 3;

/** Public part of a share link for display. Never includes the URL fragment (decryption key). */
export function shortShareLink(share: any) {
  const id = String(share?.id || '');
  return `…/?share=${id.slice(0, 8)}…${id.slice(-4)}`;
}

/** Milliseconds until the link expires, or null when it has no expiry date. */
export function msUntilExpiry(share: any, now: number): number | null {
  const expiresAt = Number(share?.options?.expiresAt || share?.expiresAt || 0);
  return expiresAt ? expiresAt - now : null;
}

/** "Expira em 42 min", "Expira em 1 h 5 min" or "Expirado". */
export function formatRemaining(ms: number) {
  if (ms <= 0) return 'Expirado';
  if (ms < 60_000) return 'Expira em menos de 1 min';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `Expira em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `Expira em ${hours} h ${rest} min` : `Expira em ${hours} h`;
}

/** Human-readable summary of how a share link is configured. */
export function describeShare(share: any) {
  const options = share?.options || {};
  const expiresAt = Number(options.expiresAt || share?.expiresAt || 0);
  const expiresLabel = expiresAt
    ? (expiresAt <= Date.now() ? 'Expirado' : `Expira em ${new Date(expiresAt).toLocaleString()}`)
    : 'Permanente';
  const accessLabel = options.oneTimeView
    ? 'Visualização única'
    : (options.allowDownload === false ? 'Download desativado' : 'Download permitido');
  return {
    passwordLabel: options.requirePassword ? 'Com senha' : 'Sem senha',
    accessLabel,
    expiresLabel,
  };
}
