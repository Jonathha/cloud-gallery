import { getApiUrl } from './apiUrl';
import { recordSecurityEvent } from '../services/adminAuditService';

export interface SecurityState {
  module: string;
  isBlocked: boolean;
  isCaptchaRequired: boolean;
  retryAfterMinutes?: number;
  reason?: string;
}

type SecurityListener = (states: Record<string, SecurityState>) => void;

let securityStates: Record<string, SecurityState> = {};
const listeners = new Set<SecurityListener>();
const lastResetTime: Record<string, number> = {};

export function subscribeSecurityState(listener: SecurityListener) {
  listeners.add(listener);
  listener(securityStates);
  return () => {
    listeners.delete(listener);
  };
}

export function resetSecurityState(module?: string) {
  const now = Date.now();
  if (module) {
    lastResetTime[module] = now;
    const newState = { ...securityStates };
    delete newState[module];
    securityStates = newState;
  } else {
    Object.keys(securityStates).forEach(m => {
      lastResetTime[m] = now;
    });
    securityStates = {};
  }
  listeners.forEach(l => l(securityStates));
}

function getModuleFromUrl(url: string): string {
  if (url.includes('/api/share/view') || url.includes('/share')) return 'share_view';
  if (url.includes('/api/share/create')) return 'share_create';
  if (url.includes('/api/share')) return 'share_manage';
  if (url.includes('/api/auth')) return 'auth';
  if (url.includes('/upload')) return 'upload';
  if (url.includes('/api/storage')) return 'storage';
  return 'general';
}

// Global window.fetch interceptor
const originalFetch = window.fetch;

window.fetch = async function (...args) {
  const url = typeof args[0] === 'string' 
    ? args[0] 
    : (args[0] instanceof Request ? args[0].url : String(args[0]));
  
  if (url.includes('/api/verify-recaptcha') || url.includes('/api/logs')) {
    return originalFetch.apply(this, args);
  }

  const module = getModuleFromUrl(url);
  const requestStartTime = Date.now();

  const response = await originalFetch.apply(this, args);

  // Check HTTP security status codes & headers
  const isCaptchaHeader = response.headers.get('x-security-captcha-required') === 'true' || 
                          response.headers.get('X-Security-Captcha-Required') === 'true';

  if (response.status === 401 || response.status === 403) {
    recordSecurityEvent({
      type: response.status === 401 ? 'http_401' : 'http_403',
      module,
      reason: response.status === 401 ? 'Acesso não autorizado (401)' : 'Acesso proibido/negado (403)',
      path: url
    });
  } else if (response.status === 404 || response.status === 410) {
    const isShare = url.includes('/share');
    recordSecurityEvent({
      type: isShare ? 'share_enumeration' : (response.status === 404 ? 'http_404' : 'http_410'),
      module,
      reason: isShare 
        ? `Tentativa de acesso/enumeração a link de compartilhamento inexistente ou expirado (${response.status})` 
        : `Recurso não encontrado (${response.status})`,
      path: url
    });
  }

  if (response.status === 429 || isCaptchaHeader) {
    const lastReset = lastResetTime[module] || 0;
    // Ignora respostas 429 desatualizadas iniciadas antes ou logo após a solução do CAPTCHA
    if (lastReset > requestStartTime || (Date.now() - lastReset < 3000)) {
      return response;
    }

    try {
      const cloned = response.clone();
      const data = await cloned.json();
      
      const isBlocked = data.blocked === true;
      const isCaptchaRequired = data.captchaRequired === true || isCaptchaHeader;
      
      securityStates = {
        ...securityStates,
        [module]: {
          module,
          isBlocked,
          isCaptchaRequired,
          retryAfterMinutes: data.retryAfterMinutes,
          reason: data.error || 'Verificação de segurança necessária.'
        }
      };
      listeners.forEach(l => l(securityStates));

      recordSecurityEvent({
        type: isCaptchaRequired ? 'captcha_triggered' : (isBlocked ? 'temporary_block' : 'rate_limit'),
        module,
        reason: data.error || (isCaptchaRequired ? 'CAPTCHA exigido' : 'Rate limit excedido'),
        path: url
      });
    } catch (err) {
      // JSON parsing failed or wasn't JSON
      securityStates = {
        ...securityStates,
        [module]: {
          module,
          isBlocked: response.status === 429 && !isCaptchaHeader,
          isCaptchaRequired: isCaptchaHeader,
          reason: 'Atividade incomum detectada.'
        }
      };
      listeners.forEach(l => l(securityStates));
    }
  }

  return response;
};

/**
 * Report suspicious client-side route probing attempt to backend
 */
export async function reportProbe(path: string) {
  try {
    const targetUrl = getApiUrl(`/api/security/report-probe?path=${encodeURIComponent(path)}`);
    const res = await originalFetch(targetUrl);
    const module = getModuleFromUrl(targetUrl);
    
    if (res.status === 429) {
      const data = await res.json();
      const isBlocked = data.blocked === true;
      const isCaptchaRequired = data.captchaRequired === true;
      securityStates = {
        ...securityStates,
        [module]: {
          module,
          isBlocked,
          isCaptchaRequired,
          retryAfterMinutes: data.retryAfterMinutes,
          reason: data.error || 'Suspeita de varredura de rotas.'
        }
      };
      listeners.forEach(l => l(securityStates));
    } else if (res.headers.get('x-security-captcha-required') === 'true') {
      securityStates = {
        ...securityStates,
        [module]: {
          ...securityStates[module],
          module,
          isCaptchaRequired: true
        }
      };
      listeners.forEach(l => l(securityStates));
    }
  } catch (e) {
    // Ignore network offline errors
  }
}
