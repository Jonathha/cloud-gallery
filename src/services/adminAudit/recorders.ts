import { authPrimary } from '../../firebase';
import { getApiUrl } from '../../utils/apiUrl';
import { getClientMetadata, getAuthHeaders } from './utils';
import { state } from './state';
import { AuditEventRecord, SecurityEventRecord, AuditEventType, SecurityEventType } from './types';

/**
 * Registra ou atualiza o acesso de um usuário (autenticado ou anônimo) através do Worker
 */
export async function recordUserAccess(user?: { uid: string; email?: string | null; displayName?: string | null } | null) {
  const now = Date.now();
  if (now - state.lastAccessRecordedTime < 10000) return; // Debounce 10s para evitar requisições duplicadas
  state.lastAccessRecordedTime = now;

  try {
    const meta = getClientMetadata();
    const current = authPrimary.currentUser;
    const targetUser = user || current;

    const isAnon = !targetUser;
    const uid = targetUser?.uid || meta.sessionId;
    const email = targetUser?.email || (isAnon ? 'Visitante Anônimo' : 'Usuário Sem E-mail');
    const displayName = targetUser?.displayName || (isAnon ? 'Visitante Anônimo' : (email.includes('@') ? email.split('@')[0] : 'Usuário'));
    const provider = isAnon ? 'anonymous' : (current?.providerData?.[0]?.providerId || 'email/password');

    const headers = await getAuthHeaders();

    await fetch(getApiUrl('/api/logs/record'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        logType: 'user_access',
        data: {
          uid,
          email,
          displayName,
          provider,
          timeZone: meta.timeZone,
          sessionId: meta.sessionId,
          userAgent: meta.userAgent,
          platform: meta.platform,
          browser: meta.browser,
          operatingSystem: meta.operatingSystem,
          language: meta.language,
          anonymous: isAnon,
          loginAt: now,
          lastSeen: now,
          online: true
        }
      })
    }).catch(() => {});

    if (!state.sessionEntryLogged) {
      state.sessionEntryLogged = true;
      recordAuditEvent({
        type: 'system_entry',
        userId: uid,
        userEmail: email,
        details: `Sessão iniciada (${meta.browser} no ${meta.operatingSystem}, fuso: ${meta.timeZone})`
      });
    }
  } catch (err) {
    // Tratamento limpo de erros
  }
}

/**
 * Registra um evento de auditoria através do servidor backend (Worker)
 */
export async function recordAuditEvent(event: {
  type: AuditEventType;
  userId?: string;
  userEmail?: string;
  details: string;
}) {
  try {
    const meta = getClientMetadata();
    const current = authPrimary.currentUser;
    const isAnon = !current && !event.userId;

    const userId = event.userId || current?.uid || meta.sessionId;
    const userEmail = event.userEmail || current?.email || (isAnon ? 'Anônimo' : 'N/A');
    const timestamp = Date.now();
    const headers = await getAuthHeaders();

    const record: AuditEventRecord = {
      type: event.type,
      userId,
      userEmail,
      timestamp,
      details: event.details,
      sessionId: meta.sessionId,
      platform: meta.platform,
      browser: meta.browser,
      operatingSystem: meta.operatingSystem,
      anonymous: isAnon
    };

    state.localAuditLogs.unshift(record);

    await fetch(getApiUrl('/api/logs/record'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        logType: 'audit',
        data: record
      })
    }).catch(() => {});
  } catch (err) {
    // Tratamento limpo de erros
  }
}

/**
 * Registra um evento de segurança através do servidor backend (Worker)
 */
export async function recordSecurityEvent(event: {
  type: SecurityEventType;
  module: string;
  reason: string;
  path?: string;
  userId?: string;
  userEmail?: string;
  ip?: string;
}) {
  if (state.isSendingSecurityEvent) return;
  state.isSendingSecurityEvent = true;

  try {
    const meta = getClientMetadata();
    const current = authPrimary.currentUser;
    const isAnon = !current && !event.userId;

    const userId = event.userId || current?.uid || meta.sessionId;
    const userEmail = event.userEmail || current?.email || (isAnon ? 'Anônimo' : 'Desconhecido');
    const timestamp = Date.now();
    const headers = await getAuthHeaders();

    const record: SecurityEventRecord = {
      type: event.type,
      module: event.module,
      timestamp,
      userId,
      userEmail,
      reason: event.reason,
      path: event.path || '',
      ip: event.ip || '',
      sessionId: meta.sessionId,
      platform: meta.platform,
      browser: meta.browser,
      operatingSystem: meta.operatingSystem,
      anonymous: isAnon
    };

    state.localSecurityEvents.unshift(record);

    await fetch(getApiUrl('/api/logs/record'), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        logType: 'security',
        data: record
      })
    }).catch(() => {});
  } catch (err) {
    // Tratamento limpo de erros
  } finally {
    state.isSendingSecurityEvent = false;
  }
}
