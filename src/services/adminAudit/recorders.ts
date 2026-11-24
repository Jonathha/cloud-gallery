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
        action: 'system_entry',
        userId: uid,
        userEmail: email,
        result: 'Sessão iniciada com sucesso',
        status: 'success',
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
  action?: string;
  userId?: string;
  userEmail?: string;
  details: string;
  fileName?: string;
  fileSize?: number;
  mediaType?: string;
  itemCount?: number;
  resourceId?: string;
  result?: string;
  status?: string;
  method?: string;
  targetUid?: string;
  targetEmail?: string;
  attemptNumber?: number;
  maxAttempts?: number;
  locked?: boolean;
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
      action: event.action || event.type,
      userId,
      userEmail,
      timestamp,
      details: event.details,
      sessionId: meta.sessionId,
      userAgent: meta.userAgent,
      platform: meta.platform,
      browser: meta.browser,
      operatingSystem: meta.operatingSystem,
      anonymous: isAnon,
      ...(event.fileName !== undefined ? { fileName: event.fileName } : {}),
      ...(event.fileSize !== undefined ? { fileSize: event.fileSize } : {}),
      ...(event.mediaType !== undefined ? { mediaType: event.mediaType } : {}),
      ...(event.itemCount !== undefined ? { itemCount: event.itemCount } : {}),
      ...(event.resourceId !== undefined ? { resourceId: event.resourceId } : {}),
      ...(event.result !== undefined ? { result: event.result } : {}),
      ...(event.status !== undefined ? { status: event.status } : {}),
      ...(event.method !== undefined ? { method: event.method } : {}),
      ...(event.targetUid !== undefined ? { targetUid: event.targetUid } : {}),
      ...(event.targetEmail !== undefined ? { targetEmail: event.targetEmail } : {}),
      ...(event.attemptNumber !== undefined ? { attemptNumber: event.attemptNumber } : {}),
      ...(event.maxAttempts !== undefined ? { maxAttempts: event.maxAttempts } : {}),
      ...(event.locked !== undefined ? { locked: event.locked } : {})
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
  method?: string;
  statusCode?: number;
  ruleCode?: string;
  actionTaken?: string;
  detectionResult?: string;
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
      userAgent: meta.userAgent,
      platform: meta.platform,
      browser: meta.browser,
      operatingSystem: meta.operatingSystem,
      anonymous: isAnon,
      ...(event.method !== undefined ? { method: event.method } : {}),
      ...(event.statusCode !== undefined ? { statusCode: event.statusCode } : {}),
      ...(event.ruleCode !== undefined ? { ruleCode: event.ruleCode } : {}),
      ...(event.actionTaken !== undefined ? { actionTaken: event.actionTaken } : {}),
      ...(event.detectionResult !== undefined ? { detectionResult: event.detectionResult } : {})
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
