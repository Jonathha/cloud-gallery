import { Request, Response } from 'express';
import { getClientIpFromRequest } from './constants';
import { verifyFirebaseIdToken, extractBearerToken } from './auth';
import { writeLogsDocREST } from './restClient';
import { buildUserAccessPayload, buildAuditPayload } from './recordLogBuilders';

export async function handleRecordLogExpress(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const ip = getClientIpFromRequest(req);
    const userAgent = (req.headers['user-agent'] as string) || '';
    const { logType, data } = body;

    if (!logType || !data) {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos.' });
    }

    const idToken = extractBearerToken(req);
    const verifiedUser = idToken ? await verifyFirebaseIdToken(idToken) : null;
    const timestamp = Date.now();

    if (logType === 'user_access') {
      const { docId, isAnon, payload } = buildUserAccessPayload(verifiedUser, data, ip, userAgent, timestamp);
      await writeLogsDocREST('user_accesses', payload, docId);
      return res.json({ success: true, verified: Boolean(verifiedUser), anonymous: isAnon });
    }

    if (logType === 'audit') {
      const { isAnon, payload } = buildAuditPayload(verifiedUser, data, ip, timestamp, userAgent);
      await writeLogsDocREST('audit_logs', payload);
      return res.json({ success: true, verified: Boolean(verifiedUser), anonymous: isAnon });
    }

    if (logType === 'security') {
      const isAnon = !verifiedUser;
      await writeLogsDocREST('security_events', {
        type: data.type || 'unauthorized_access',
        event: data.event || data.type || 'unauthorized_access',
        severity: data.severity || 'medium',
        module: data.module || 'system',
        timestamp: data.timestamp || timestamp,
        userId: verifiedUser ? verifiedUser.uid : 'anonymous',
        userEmail: verifiedUser ? (verifiedUser.email || 'Usuário Sem E-mail') : 'Anônimo',
        reason: data.reason || 'Evento de segurança',
        details: data.details || data.reason || 'Evento de segurança',
        path: data.path || '',
        ip: data.ip || ip,
        userAgent: data.userAgent || userAgent,
        platform: data.platform || '',
        browser: data.browser || '',
        operatingSystem: data.operatingSystem || '',
        sessionId: data.sessionId || '',
        anonymous: isAnon,
        ...(data.method !== undefined ? { method: data.method } : {}),
        ...(data.statusCode !== undefined ? { statusCode: data.statusCode } : {}),
        ...(data.ruleCode !== undefined ? { ruleCode: data.ruleCode } : {}),
        ...(data.actionTaken !== undefined ? { actionTaken: data.actionTaken } : {}),
        ...(data.detectionResult !== undefined ? { detectionResult: data.detectionResult } : {})
      });
      return res.json({ success: true, verified: Boolean(verifiedUser), anonymous: isAnon });
    }

    return res.status(400).json({ success: false, error: 'Tipo de log inválido.' });
  } catch (err: any) {
    console.error('[ServerLogs] Erro interno:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao salvar log.' });
  }
}
