import { jsonResponse } from '../workerHelpers.js';
import { getModuleAndId } from './moduleMatcher.js';
import { getLimiterStub } from './probeRecorder.js';
import { verifyClearanceToken } from '../workerAuthRecaptcha.js';
import { checkShareRateLimit } from './shareRateLimiter.js';

export function detectTorOrVpn(request) {
  const cf = request?.cf || {};
  const isTor = cf.isTor === true || 
                cf.country === 'T1' || 
                request.headers.get('CF-IPCountry') === 'T1' || 
                request.headers.get('CF-Is-Tor') === 'true';

  const threatScore = typeof cf.threatScore === 'number' ? cf.threatScore : 0;
  const isHighThreat = threatScore >= 15;

  const asOrg = (cf.asOrganization || '').toLowerCase();
  const suspiciousAsns = [
    'm247', 'ovh', 'digitalocean', 'linode', 'vultr', 'hetzner', 'leaseweb',
    'choopa', 'datacamp', 'hostinger', 'kamatera', 'packethub', 'nordvpn',
    'expressvpn', 'surfshark', 'proton', 'contabo', 'cogent', 'tzulo',
    'serverius', 'datapacket', 'ipvanish', 'mullvad', 'private internet access',
    'fastly', 'akamai', 'fly.io', 'cloudflare'
  ];
  const isDatacenterVpn = suspiciousAsns.some(asn => asOrg.includes(asn));

  return {
    isTor,
    isHighThreat,
    isDatacenterVpn,
    isSuspicious: isTor || isHighThreat || isDatacenterVpn,
    reason: isTor ? 'Tor Exit Node' : isHighThreat ? `High Threat Score (${threatScore})` : isDatacenterVpn ? `Datacenter/VPN (${cf.asOrganization || 'Hosting'})` : null
  };
}

export async function checkWorkerAbuseProtection(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api/verify-recaptcha' || path === '/api/health' || path === '/api/ip' || path === '/api/version') {
    return { blocked: false, delayMs: 0 };
  }

  const detection = detectTorOrVpn(request);

  // 1. Aplica Rate Limiting dinâmico estrito e proteção de borda na rota /api/share/*
  if (path.startsWith('/api/share')) {
    const shareLimit = await checkShareRateLimit(request, env, ctx, detection);
    if (shareLimit.blocked) {
      return shareLimit;
    }
  }

  const { module, id } = await getModuleAndId(request);

  // Extrai o shareId caso a requisição seja para visualização de link
  let currentShareId = null;
  if (path.startsWith('/api/share/view/')) {
    currentShareId = path.replace('/api/share/view/', '').split('/')[0].split('?')[0];
  }

  // 2. Verifica token de liberação prévia assinado (Clearance Token no Header ou Cookie)
  const clearanceHeader = request.headers.get('X-Captcha-Clearance');
  const cookieHeader = request.headers.get('Cookie') || '';
  let clearanceFromCookie = null;
  if (cookieHeader.includes('cf_clearance_custom=')) {
    const match = cookieHeader.match(/cf_clearance_custom=([^;]+)/);
    if (match) clearanceFromCookie = match[1];
  }
  const clearanceToTest = clearanceHeader || clearanceFromCookie;
  if (clearanceToTest) {
    const tokenSecret = env?.TURNSTILE_SECRET_KEY;
    const isValid = await verifyClearanceToken(clearanceToTest, tokenSecret, currentShareId, detection.isSuspicious);
    if (isValid) {
      return { blocked: false, delayMs: 0, captchaRequired: false, captchaVerified: true, module, isTorOrVpn: false };
    }
  }

  // Tarpit delay for Tor and VPN connections to prevent mass requests and quota exhaustion
  let delayMs = 0;
  if (detection.isSuspicious) {
    delayMs = detection.isTor ? 3000 : 2000;
  }

  const stub = getLimiterStub(env, module, id);
  if (!stub) {
    const requiresCaptcha = detection.isSuspicious && (path.startsWith('/api/share/view') || path.startsWith('/api/auth'));
    return { blocked: false, delayMs, captchaRequired: requiresCaptcha, module, isTorOrVpn: detection.isSuspicious };
  }

  try {
    const res = await stub.fetch('https://do/limiter?action=check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module,
        id,
        path,
        method: request.method,
        isTor: detection.isTor,
        isHighThreat: detection.isHighThreat,
        isDatacenterVpn: detection.isDatacenterVpn,
        threatReason: detection.reason,
        shareId: currentShareId
      }),
    });
    const data = await res.json();
    if (data.blocked) {
      return {
        blocked: true,
        response: jsonResponse(data.response || { success: false, error: 'Muitas requisições.', blocked: true }, 429),
      };
    }

    const isCaptchaVerified = data.captchaVerified === true;
    const captchaRequired = !isCaptchaVerified && (data.captchaRequired === true || (detection.isSuspicious && (path.startsWith('/api/share/view') || path.startsWith('/api/auth'))));
    return {
      blocked: false,
      delayMs: isCaptchaVerified ? 0 : (data.delayMs !== undefined ? data.delayMs : delayMs),
      captchaRequired: !!captchaRequired,
      captchaVerified: isCaptchaVerified,
      module,
      isTorOrVpn: detection.isSuspicious
    };
  } catch (err) {
    console.error('[SECURITY_AUDIT] Erro na checagem do RateLimiter:', err);
    return {
      blocked: false,
      delayMs,
      captchaRequired: detection.isSuspicious && path.startsWith('/api/share/view'),
      module,
      isTorOrVpn: detection.isSuspicious
    };
  }
}

export async function resetWorkerCaptcha(request, env, moduleName, shareId = null, isSuspicious = false) {
  const dummyUrl = new URL(`https://example.com/api/${moduleName === 'general' ? '' : moduleName}/fake`);
  const mockRequest = new Request(dummyUrl, { headers: request.headers });
  const { module, id } = await getModuleAndId(mockRequest);
  
  // Limpa apenas o módulo específico e envia o shareId correspondente
  const targetMod = moduleName || module || 'general';
  const stub = getLimiterStub(env, targetMod, id);
  if (stub) {
    try {
      await stub.fetch('https://do/limiter?action=verify_captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: targetMod, id, shareId }),
      });
    } catch (e) {
      console.error('[SECURITY_AUDIT] Erro ao resetar captcha:', e);
    }
  }
}
