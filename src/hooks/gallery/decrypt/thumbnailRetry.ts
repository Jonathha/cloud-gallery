// Retry curto da busca de miniatura (cabe no orçamento da primeira tela) e
// registro das que falharam, para recuperação individual em segundo plano.

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const jitter = (base: number) => base + Math.floor(Math.random() * 100);

export async function fetchThumbnailWithRetry<T>(fetcher: (freshToken: boolean) => Promise<T>): Promise<T> {
  let fresh = false;
  let used401 = false;
  let used4xx = false;
  let transient = 0;
  for (;;) {
    try {
      return await fetcher(fresh);
    } catch (err: any) {
      const status: number | undefined = typeof err?.status === 'number' ? err.status : undefined;
      if (status === 429) throw err; // proteção do servidor: nunca insistir aqui
      if (status === 401 && !used401) { used401 = true; fresh = true; continue; }
      if ((status === 403 || status === 404) && !used4xx) { used4xx = true; await sleep(jitter(350)); continue; }
      if ((status === undefined ? err?.name === 'TypeError' : status >= 500) && transient < 2) {
        await sleep(jitter(transient === 0 ? 250 : 500));
        transient++;
        continue;
      }
      throw err;
    }
  }
}

interface FailedThumb { attempts: number; max: number; notBefore: number }
const failed = new Map<string, FailedThumb>();
const listeners = new Set<() => void>();

export function registerFailedThumbnail(id: string, status?: number, retryAfterSec?: number) {
  const notBefore = retryAfterSec && retryAfterSec > 0 ? Date.now() + Math.min(retryAfterSec, 60) * 1000 : 0;
  const prev = failed.get(id);
  if (prev) { if (notBefore) prev.notBefore = notBefore; return; }
  // 403/404 podem ser erro do D1/R2 mascarado, mas também arquivo ausente: só 1 tentativa extra
  failed.set(id, { attempts: 0, max: status === 403 || status === 404 ? 1 : 2, notBefore });
  listeners.forEach((cb) => cb());
}

export function dueFailedThumbnails(): string[] {
  const now = Date.now();
  const ids: string[] = [];
  for (const [id, f] of failed) if (f.attempts < f.max && f.notBefore <= now) ids.push(id);
  return ids;
}

export function hasPendingRecovery(): boolean {
  for (const f of failed.values()) if (f.attempts < f.max) return true;
  return false;
}

export function beginRecovery(id: string) {
  const f = failed.get(id);
  if (f) f.attempts++;
}

export function endRecovery(id: string, ok: boolean) {
  const f = failed.get(id);
  if (f && (ok || f.attempts >= f.max)) failed.delete(id);
}

export function subscribeFailedThumbnails(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
