import { jsonResponse } from '../workerHelpers.js';

// Janela deslizante de 60 segundos para controle de taxa em memória no Worker
const shareIpWindows = new Map();
const WINDOW_MS = 60 * 1000;
const BAN_DURATION_SEC = 60;

// Limpeza automática periódica da memória
let lastCleanup = Date.now();
function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < 30 * 1000) return;
  lastCleanup = now;
  for (const [ip, entry] of shareIpWindows.entries()) {
    if (now - entry.windowStart > WINDOW_MS && now > (entry.bannedUntil || 0)) {
      shareIpWindows.delete(ip);
    }
  }
}

/**
 * Controla e impõe limites de taxa estritos e dinâmicos EXCLUSIVAMENTE na rota /api/share/*
 * - IPs normais / residenciais: limite de 30 requisições por minuto (entre 20 a 32).
 * - IPs suspeitos (VPN, Datacenter, Tor, High Threat): limite estrito de 15 requisições por minuto (< 20).
 * - Usuários legítimos em navegação padrão (1 a 5 requisições) nunca sofrem interferência.
 * - Ao estourar o limite, ativa bloqueio na Edge via Cache API (caches.default) para descarte em <1ms.
 */
export async function checkShareRateLimit(request, env, ctx, detection) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Aplica SOMENTE na rota de compartilhamento (/api/share/*)
  if (!path.startsWith('/api/share')) {
    return { blocked: false };
  }

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '0.0.0.0';
  const now = Date.now();
  cleanupExpired();

  // 1. Verificação rápida na Cache API da Cloudflare (Bloqueio na Borda em <1ms sem CPU)
  const cacheKey = new Request(`https://rate-limit.internal/share-ban/${encodeURIComponent(ip)}`, { method: 'GET' });
  let cache = null;
  try {
    if (typeof caches !== 'undefined' && caches.default) {
      cache = caches.default;
      const cachedBlock = await cache.match(cacheKey);
      if (cachedBlock) {
        return {
          blocked: true,
          response: jsonResponse({
            success: false,
            error: 'Muitas requisições na rota de compartilhamento. Por favor, aguarde 1 minuto.',
            blocked: true,
            retryAfter: 60
          }, 429)
        };
      }
    }
  } catch (err) {
    // Falha silenciosa de cache, segue para controle em memória
  }

  // 2. Determina o limite dinâmico com base na reputação do IP
  const isSuspicious = detection?.isSuspicious || false;
  // Conexões VPN / Tor / Datacenter / Threat: limite estrito < 20 (15 req/min)
  // Conexões normais residenciais: 30 req/min (faixa 20 a 32 req/min)
  const maxRequestsPerMinute = isSuspicious ? 15 : 30;

  // 3. Consulta / atualiza a janela deslizante do IP
  let entry = shareIpWindows.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    entry = {
      windowStart: now,
      count: 1,
      bannedUntil: 0
    };
    shareIpWindows.set(ip, entry);
    return { blocked: false };
  }

  // Se o IP estiver em período de penalidade ativa em memória
  if (entry.bannedUntil > now) {
    const remainingSec = Math.max(1, Math.ceil((entry.bannedUntil - now) / 1000));
    return {
      blocked: true,
      response: jsonResponse({
        success: false,
        error: `Muitas requisições na rota de compartilhamento. Por favor, aguarde ${remainingSec} segundos.`,
        blocked: true,
        retryAfter: remainingSec
      }, 429)
    };
  }

  // Incrementa a contagem na janela atual
  entry.count += 1;

  // Se ultrapassou o limite do IP:
  if (entry.count > maxRequestsPerMinute) {
    entry.bannedUntil = now + (BAN_DURATION_SEC * 1000);
    shareIpWindows.set(ip, entry);

    const blockResponse = new Response(
      JSON.stringify({
        success: false,
        error: 'Muitas requisições na rota de compartilhamento. Por favor, aguarde 1 minuto.',
        blocked: true,
        retryAfter: BAN_DURATION_SEC
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': `public, max-age=${BAN_DURATION_SEC}, s-maxage=${BAN_DURATION_SEC}`,
          'Retry-After': String(BAN_DURATION_SEC)
        }
      }
    );

    // Grava no Edge Cache da Cloudflare para que chamadas subsequentes sejam barradas instantaneamente
    if (cache && ctx && typeof ctx.waitUntil === 'function') {
      try {
        ctx.waitUntil(cache.put(cacheKey, blockResponse.clone()));
      } catch (e) {
        // Ignora erro assíncrono de gravação em cache
      }
    }

    return {
      blocked: true,
      response: blockResponse
    };
  }

  return { blocked: false };
}
