import { authPrimary } from '../../firebase';
import { getApiUrl } from '../../utils/apiUrl';
import { getAuthHeaders } from './utils';
import { state } from './state';
import { UserAccessRecord, AuditEventRecord, SecurityEventRecord } from './types';

/**
 * Busca acessos via Worker REST
 */
export function subscribeUserAccesses(callback: (records: UserAccessRecord[]) => void) {
  let interval: any = null;

  const fetchAccesses = async () => {
    if (document.hidden) return;
    if (!authPrimary.currentUser) {
      callback(state.localAccesses);
      return;
    }
    try {
      const headers = await getAuthHeaders();
      if (!headers['Authorization']) {
        callback(state.localAccesses);
        return;
      }
      const res = await fetch(getApiUrl('/api/logs/list?collection=user_accesses&limit=50'), { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.records)) {
          const records: UserAccessRecord[] = json.records.map((r: any) => ({
            uid: r.uid || r.id,
            email: r.email || 'Usuário',
            displayName: r.displayName || 'Usuário',
            provider: r.provider || 'email/password',
            firstAccess: r.firstAccess || Date.now(),
            lastAccess: r.lastAccess || r.lastSeen || Date.now(),
            accessCount: r.accessCount || 1,
            timeZone: r.timezone || r.timeZone || 'UTC',
            userAgent: r.userAgent || '',
            platform: r.platform || '',
            browser: r.browser || '',
            operatingSystem: r.operatingSystem || '',
            language: r.language || '',
            country: r.country || '',
            city: r.city || '',
            region: r.region || '',
            ipVersion: r.ipVersion || '',
            requestId: r.requestId || '',
            loginAt: r.loginAt || Date.now(),
            lastSeen: r.lastSeen || Date.now(),
            online: r.online !== undefined ? r.online : true,
            anonymous: r.anonymous || false,
            sessionId: r.sessionId || '',
            ip: r.ip || ''
          }));
          records.sort((a, b) => (b.lastAccess || 0) - (a.lastAccess || 0));
          state.localAccesses = records;
          callback(records);
          return;
        }
      }
      callback(state.localAccesses);
    } catch (err) {
      callback(state.localAccesses);
    }
  };

  fetchAccesses();
  interval = setInterval(fetchAccesses, 15000);
  return () => {
    if (interval) clearInterval(interval);
  };
}

/**
 * Busca logs do sistema via Worker REST
 */
export function subscribeAuditLogs(callback: (records: AuditEventRecord[]) => void) {
  let interval: any = null;

  const fetchAuditLogs = async () => {
    if (document.hidden) return;
    if (!authPrimary.currentUser) {
      callback(state.localAuditLogs);
      return;
    }
    try {
      const headers = await getAuthHeaders();
      if (!headers['Authorization']) {
        callback(state.localAuditLogs);
        return;
      }
      const res = await fetch(getApiUrl('/api/logs/list?collection=audit_logs&limit=50'), { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.records)) {
          const records: AuditEventRecord[] = json.records.map((r: any) => ({
            id: r.id,
            type: r.type || 'system_entry',
            action: r.action || r.type || 'system_entry',
            userId: r.userId || 'anonymous',
            userEmail: r.userEmail || 'N/A',
            adminUid: r.adminUid,
            adminEmail: r.adminEmail,
            targetUid: r.targetUid,
            targetEmail: r.targetEmail,
            timestamp: r.timestamp || Date.now(),
            details: r.details || '',
            ip: r.ip || '',
            userAgent: r.userAgent || '',
            platform: r.platform || '',
            browser: r.browser || '',
            operatingSystem: r.operatingSystem || '',
            country: r.country || '',
            city: r.city || '',
            sessionId: r.sessionId || '',
            anonymous: r.anonymous || false
          }));
          records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          state.localAuditLogs = records;
          callback(records);
          return;
        }
      }
      callback(state.localAuditLogs);
    } catch (err) {
      callback(state.localAuditLogs);
    }
  };

  fetchAuditLogs();
  interval = setInterval(fetchAuditLogs, 15000);
  return () => {
    if (interval) clearInterval(interval);
  };
}

/**
 * Busca eventos de segurança via Worker REST
 */
export function subscribeSecurityEvents(callback: (records: SecurityEventRecord[]) => void) {
  let interval: any = null;

  const fetchSecurityEvents = async () => {
    if (document.hidden) return;
    if (!authPrimary.currentUser) {
      callback(state.localSecurityEvents);
      return;
    }
    try {
      const headers = await getAuthHeaders();
      if (!headers['Authorization']) {
        callback(state.localSecurityEvents);
        return;
      }
      const res = await fetch(getApiUrl('/api/logs/list?collection=security_events&limit=50'), { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.records)) {
          const records: SecurityEventRecord[] = json.records.map((r: any) => ({
            id: r.id,
            type: r.type || r.event || 'unauthorized_access',
            event: r.event || r.type || 'unauthorized_access',
            severity: r.severity || 'medium',
            module: r.module || 'system',
            timestamp: r.timestamp || Date.now(),
            userId: r.userId || r.uid || 'anonymous',
            userEmail: r.userEmail || r.email || 'Desconhecido',
            uid: r.uid || r.userId,
            email: r.email || r.userEmail,
            ip: r.ip || '',
            reason: r.reason || r.details || '',
            details: r.details || r.reason || '',
            path: r.path || '',
            userAgent: r.userAgent || '',
            platform: r.platform || '',
            browser: r.browser || '',
            operatingSystem: r.operatingSystem || '',
            country: r.country || '',
            city: r.city || '',
            sessionId: r.sessionId || '',
            anonymous: r.anonymous || false
          }));
          records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          state.localSecurityEvents = records;
          callback(records);
          return;
        }
      }
      callback(state.localSecurityEvents);
    } catch (err) {
      callback(state.localSecurityEvents);
    }
  };

  fetchSecurityEvents();
  interval = setInterval(fetchSecurityEvents, 15000);
  return () => {
    if (interval) clearInterval(interval);
  };
}
