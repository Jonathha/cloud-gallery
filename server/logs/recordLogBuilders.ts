import { VerifiedFirebaseUser } from './auth';

export function buildUserAccessPayload(
  verifiedUser: VerifiedFirebaseUser | null,
  data: any,
  ip: string,
  userAgent: string,
  timestamp: number
) {
  const uid = verifiedUser ? verifiedUser.uid : 'anonymous';
  const email = verifiedUser ? (verifiedUser.email || 'Usuário Sem E-mail') : 'Anônimo';
  const displayName = verifiedUser
    ? (verifiedUser.displayName || (email.includes('@') ? email.split('@')[0] : 'Usuário'))
    : 'Visitante Anônimo';
  const isAnon = !verifiedUser;
  const docId = uid.replace(/[^a-zA-Z0-9_-]/g, '_');

  return {
    docId,
    isAnon,
    payload: {
      uid, email, displayName,
      lastAccess: timestamp,
      firstAccess: data.firstAccess || timestamp,
      accessCount: data.accessCount || 1,
      timeZone: data.timeZone || 'UTC',
      ip, userAgent, anonymous: isAnon
    }
  };
}

export function buildAuditPayload(
  verifiedUser: VerifiedFirebaseUser | null,
  data: any,
  ip: string,
  timestamp: number,
  userAgent: string = ''
) {
  const userId = verifiedUser ? verifiedUser.uid : 'anonymous';
  const userEmail = verifiedUser ? (verifiedUser.email || 'Usuário Sem E-mail') : 'Anônimo';
  const isAnon = !verifiedUser;

  return {
    isAnon,
    payload: {
      type: data.type || 'system_entry',
      action: data.action || data.type || 'system_entry',
      userId,
      userEmail,
      adminUid: userId,
      adminEmail: verifiedUser ? userEmail : null,
      timestamp: data.timestamp || timestamp,
      details: data.details || '',
      ip,
      userAgent: data.userAgent || userAgent,
      platform: data.platform || '',
      browser: data.browser || '',
      operatingSystem: data.operatingSystem || '',
      sessionId: data.sessionId || '',
      anonymous: isAnon,
      ...(data.fileName !== undefined ? { fileName: data.fileName } : {}),
      ...(data.fileSize !== undefined ? { fileSize: data.fileSize } : {}),
      ...(data.mediaType !== undefined ? { mediaType: data.mediaType } : {}),
      ...(data.itemCount !== undefined ? { itemCount: data.itemCount } : {}),
      ...(data.resourceId !== undefined ? { resourceId: data.resourceId } : {}),
      ...(data.result !== undefined ? { result: data.result } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.method !== undefined ? { method: data.method } : {}),
      ...(data.targetUid !== undefined ? { targetUid: data.targetUid } : {}),
      ...(data.targetEmail !== undefined ? { targetEmail: data.targetEmail } : {}),
      ...(data.attemptNumber !== undefined ? { attemptNumber: data.attemptNumber } : {}),
      ...(data.maxAttempts !== undefined ? { maxAttempts: data.maxAttempts } : {}),
      ...(data.locked !== undefined ? { locked: data.locked } : {})
    }
  };
}
