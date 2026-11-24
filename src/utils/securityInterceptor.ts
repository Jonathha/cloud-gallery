import { getApiUrl } from './apiUrl';
import { recordSecurityEvent } from '../services/adminAuditService';
import { authPrimary } from '../firebase';

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

// Preserve original window.fetch reference
const originalFetch = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : null;

// Unified safe fetch interceptor
async function interceptedFetch(...args: any[]) {
  if (!originalFetch) {
    throw new Error('window.fetch is not available in this environment');
  }

  let [input, init] = args;
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input && typeof input === "object" && "url" in input) {
    url = (input as any).url;
  }

  // Bypass logs and verification to prevent recursive loops
  if (url.includes('/api/verify-recaptcha') || url.includes('/api/logs')) {
    return originalFetch(input, init);
  }

  // Inject Firebase Auth token for authenticated APIs if user is logged in
  if (
    url.includes("/api/storage") || 
    url.includes("/api/chat") || 
    url.includes("/api/guarly/chat") || 
    url.includes("/api/share/create") || 
    url.includes("/api/share_manage")
  ) {
    try {
      const currentUser = authPrimary.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          init.headers.set("Authorization", `Bearer ${token}`);
        } else if (Array.isArray(init.headers)) {
          const authIdx = init.headers.findIndex((h: any) => h[0].toLowerCase() === "authorization");
          if (authIdx !== -1) {
            init.headers[authIdx][1] = `Bearer ${token}`;
          } else {
            init.headers.push(["Authorization", `Bearer ${token}`]);
          }
        } else {
          init.headers = {
            ...init.headers,
            "Authorization": `Bearer ${token}`
          };
        }
        args[1] = init;
      }
    } catch (e) {
      // Ignore token retrieval failure gracefully
    }
  }

  // Inject X-Captcha-Clearance header for API requests if available
  if (url.includes('/api/')) {
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const pathShareMatch = url.match(/\/api\/share\/(?:view|download|raw|status)\/([a-zA-Z0-9_-]+)/);
      const shareId = (urlParams ? urlParams.get('share') : null) || (pathShareMatch ? pathShareMatch[1] : null);
      let clearanceToken: string | null = null;
      if (typeof sessionStorage !== 'undefined') {
        if (shareId) {
          clearanceToken = sessionStorage.getItem(`captcha_clearance_${shareId}`);
        }
        if (!clearanceToken) {
          clearanceToken = sessionStorage.getItem('captcha_clearance');
        }
      }
      if (!clearanceToken && typeof localStorage !== 'undefined') {
        if (shareId) {
          clearanceToken = localStorage.getItem(`captcha_clearance_${shareId}`);
        }
        if (!clearanceToken) {
          clearanceToken = localStorage.getItem('captcha_clearance');
        }
      }

      if (clearanceToken) {
        init = init || {};
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          if (!init.headers.has('X-Captcha-Clearance')) {
            init.headers.set('X-Captcha-Clearance', clearanceToken);
          }
        } else if (Array.isArray(init.headers)) {
          const hasCl = init.headers.some((h: any) => h[0].toLowerCase() === 'x-captcha-clearance');
          if (!hasCl) {
            init.headers.push(['X-Captcha-Clearance', clearanceToken]);
          }
        } else {
          if (!(init.headers as any)['X-Captcha-Clearance']) {
            (init.headers as any)['X-Captcha-Clearance'] = clearanceToken;
          }
        }
        args[1] = init;
      }
    } catch (e) {
      // Ignore clearance injection error
    }
  }

  const module = getModuleFromUrl(url);
  const requestStartTime = Date.now();

  const response = await originalFetch(args[0], args[1]);

  // Check 403 reCAPTCHA event
  if (response.status === 403) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      if (data && data.error === "reCAPTCHA_required") {
        window.dispatchEvent(new CustomEvent("trigger-recaptcha-verification"));
      }
    } catch (e) {}
  }

  // Check HTTP security status codes & headers
  const isCaptchaHeader = response.headers.get('x-security-captcha-required') === 'true' || 
                          response.headers.get('X-Security-Captcha-Required') === 'true';

  if (response.status === 401 || response.status === 403) {
    recordSecurityEvent({
      type: response.status === 401 ? 'http_401' : 'http_403',
      module,
      statusCode: response.status,
      reason: response.status === 401 ? 'Acesso não autorizado (401)' : 'Acesso proibido/negado (403)',
      path: url
    });
  } else if (response.status === 404 || response.status === 410) {
    const isShare = url.includes('/share');
    recordSecurityEvent({
      type: isShare ? 'share_enumeration' : (response.status === 404 ? 'http_404' : 'http_410'),
      module,
      statusCode: response.status,
      reason: isShare 
        ? `Tentativa de acesso/enumeração a link de compartilhamento inexistente ou expirado (${response.status})` 
        : `Recurso não encontrado (${response.status})`,
      path: url
    });
  }

  if (response.status === 429 || isCaptchaHeader) {
    const lastReset = lastResetTime[module] || 0;
    // Ignore outdated 429 responses
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
        statusCode: response.status,
        reason: data.error || (isCaptchaRequired ? 'CAPTCHA exigido' : 'Rate limit excedido'),
        path: url
      });
    } catch (err) {
      // Fallback for non-JSON 429
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
}

// Safely install the interceptor without throwing getter-only errors
if (typeof window !== 'undefined' && originalFetch) {
  try {
    Object.defineProperty(window, 'fetch', {
      value: interceptedFetch,
      writable: true,
      configurable: true
    });
  } catch (e1) {
    try {
      (window as any).fetch = interceptedFetch;
    } catch (e2) {
      console.warn('[SecurityInterceptor] Unable to override window.fetch:', e2);
    }
  }
}

/**
 * Report suspicious client-side route probing attempt to backend
 */
export async function reportProbe(path: string) {
  if (!originalFetch) return;
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
