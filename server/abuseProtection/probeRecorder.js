import { getModuleAndId } from './moduleMatcher.js';

export function getLimiterStub(env, module, id) {
  if (!env || !env.RATE_LIMITER) return null;
  const doId = env.RATE_LIMITER.idFromName(`${module}:${id}`);
  return env.RATE_LIMITER.get(doId);
}

export async function recordWorkerProbeAttempt(request, env, reason) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ISENÇÕES: Rotas regulares da aplicação retornando 401/403/404/500 não são probes
  if (
    path.startsWith('/api/roulette') ||
    path.startsWith('/api/admin/roulette') ||
    path.startsWith('/api/logs') ||
    path.startsWith('/api/version') ||
    path.startsWith('/api/storage') ||
    path.startsWith('/api/share') ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/ip') ||
    path.startsWith('/api/guarly') ||
    method === 'OPTIONS' ||
    method === 'DELETE'
  ) {
    return;
  }

  const { module, id } = await getModuleAndId(request);
  const stub = getLimiterStub(env, module, id);
  if (!stub) return;

  try {
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '0.0.0.0';
    const userAgent = request.headers.get('User-Agent') || 'Unknown';

    await stub.fetch('https://do/limiter?action=record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, id, path: path + url.search, method, reason, ip, userAgent }),
    });
  } catch (err) {
    console.error('[SECURITY_AUDIT] Falha ao registrar probe attempt:', err);
  }
}
