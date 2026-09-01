import { jsonResponse } from '../workerHelpers.js';
import { getModuleAndId } from './moduleMatcher.js';
import { getLimiterStub } from './probeRecorder.js';

export async function checkWorkerAbuseProtection(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/verify-recaptcha' || path === '/api/health' || path === '/api/ip' || path === '/api/version') {
    return { blocked: false, delayMs: 0 };
  }

  const { module, id } = await getModuleAndId(request);
  const stub = getLimiterStub(env, module, id);
  if (!stub) return { blocked: false, delayMs: 0, captchaRequired: false, module };

  try {
    const res = await stub.fetch('https://do/limiter?action=check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, id, path, method: request.method }),
    });
    const data = await res.json();
    if (data.blocked) {
      return {
        blocked: true,
        response: jsonResponse(data.response || { success: false, error: 'Muitas requisições.', blocked: true }, 429),
      };
    }
    return { blocked: false, delayMs: 0, captchaRequired: data.captchaRequired || false, module };
  } catch (err) {
    console.error('[SECURITY_AUDIT] Erro na checagem do RateLimiter:', err);
    return { blocked: false, delayMs: 0, captchaRequired: false, module };
  }
}

export async function resetWorkerCaptcha(request, env, moduleName) {
  const dummyUrl = new URL(`https://example.com/api/${moduleName === 'general' ? '' : moduleName}/fake`);
  const mockRequest = new Request(dummyUrl, { headers: request.headers });
  const { module, id } = await getModuleAndId(mockRequest);
  const stub = getLimiterStub(env, module, id);
  if (stub) {
    try {
      await stub.fetch('https://do/limiter?action=verify_captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, id }),
      });
    } catch (e) {
      console.error('[SECURITY_AUDIT] Erro ao resetar captcha:', e);
    }
  }
}
