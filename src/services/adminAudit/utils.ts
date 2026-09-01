import { authPrimary } from '../../firebase';

/**
 * Coleta metadados detalhados do ambiente do navegador do cliente
 */
export function getClientMetadata() {
  let sessionId = sessionStorage.getItem('app_session_id');
  if (!sessionId) {
    sessionId = `sess_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    sessionStorage.setItem('app_session_id', sessionId);
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  let browser = 'Outro';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Desconhecido';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  const language = typeof navigator !== 'undefined' ? navigator.language || 'pt-BR' : 'pt-BR';
  const platform = typeof navigator !== 'undefined' ? navigator.platform || os : os;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return {
    sessionId,
    userAgent: ua,
    platform,
    browser,
    operatingSystem: os,
    language,
    timeZone
  };
}

/**
 * Obtém os cabeçalhos de requisição incluindo o token de autenticação seguro do Firebase se disponível
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  try {
    const current = authPrimary.currentUser;
    if (current) {
      const token = await current.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // Silencioso em produção para evitar spam de logs
  }
  return headers;
}

/**
 * Retorna o timestamp de início para um período
 */
export function getPeriodStartTimestamp(period: string, customStart?: string): number {
  const now = new Date();
  if (period === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today.getTime();
  }
  if (period === 'last24h') {
    return Date.now() - 24 * 60 * 60 * 1000;
  }
  if (period === 'last7d') {
    return Date.now() - 7 * 24 * 60 * 60 * 1000;
  }
  if (period === 'last30d') {
    return Date.now() - 30 * 24 * 60 * 60 * 1000;
  }
  if (period === 'custom' && customStart) {
    return new Date(customStart).getTime() || 0;
  }
  return 0; // 'all'
}
