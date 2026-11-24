export function buildAuditDoc(verifiedUser, data, ctx, timestamp) {
  let userId, userEmail, adminUid, adminEmail, isAnon;

  if (verifiedUser) {
    userId = verifiedUser.uid;
    userEmail = verifiedUser.email || "Usuário Sem E-mail";
    adminUid = verifiedUser.uid;
    adminEmail = verifiedUser.email || "Usuário Sem E-mail";
    isAnon = false;
  } else {
    // Quando verifiedUser é nulo, identidade é obrigatoriamente anônima
    userId = "anonymous";
    userEmail = "Anônimo";
    adminUid = "anonymous";
    adminEmail = null;
    isAnon = true;
  }

  return {
    type: data.type || "system_entry",
    action: data.action || data.type || "system_entry",
    details: data.details || "",
    adminUid,
    adminEmail,
    targetUid: data.targetUid || "",
    targetEmail: data.targetEmail || "",
    userId,
    userEmail,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    platform: data.platform || "",
    browser: data.browser || "",
    operatingSystem: data.operatingSystem || "",
    language: data.language || "pt-BR",
    timezone: ctx.timezone,
    country: ctx.country,
    city: ctx.city,
    region: ctx.region,
    ipVersion: ctx.ipVersion,
    requestId: ctx.requestId,
    timestamp: data.timestamp || timestamp,
    sessionId: data.sessionId || `sess_${userId}_${timestamp}`,
    anonymous: isAnon,
    ...(data.fileName !== undefined ? { fileName: data.fileName } : {}),
    ...(data.fileSize !== undefined ? { fileSize: data.fileSize } : {}),
    ...(data.mediaType !== undefined ? { mediaType: data.mediaType } : {}),
    ...(data.itemCount !== undefined ? { itemCount: data.itemCount } : {}),
    ...(data.resourceId !== undefined ? { resourceId: data.resourceId } : {}),
    ...(data.result !== undefined ? { result: data.result } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.method !== undefined ? { method: data.method } : {}),
    ...(data.attemptNumber !== undefined ? { attemptNumber: data.attemptNumber } : {}),
    ...(data.maxAttempts !== undefined ? { maxAttempts: data.maxAttempts } : {}),
    ...(data.locked !== undefined ? { locked: data.locked } : {})
  };
}

export function buildSecurityDoc(verifiedUser, data, ctx, timestamp) {
  let uid, email, isAnon;

  if (verifiedUser) {
    uid = verifiedUser.uid;
    email = verifiedUser.email || "Usuário Sem E-mail";
    isAnon = false;
  } else {
    // Quando verifiedUser é nulo, identidade é obrigatoriamente anônima
    uid = "anonymous";
    email = "Anônimo";
    isAnon = true;
  }

  return {
    event: data.event || data.type || "unauthorized_access",
    type: data.type || data.event || "unauthorized_access",
    severity: data.severity || "medium",
    details: data.details || data.reason || "Evento de segurança",
    reason: data.reason || data.details || "Evento de segurança",
    module: data.module || "system",
    path: data.path || "",
    ...(data.method !== undefined ? { method: data.method } : {}),
    ...(data.statusCode !== undefined ? { statusCode: data.statusCode } : {}),
    ...(data.ruleCode !== undefined ? { ruleCode: data.ruleCode } : {}),
    ...(data.actionTaken !== undefined ? { actionTaken: data.actionTaken } : {}),
    ...(data.detectionResult !== undefined ? { detectionResult: data.detectionResult } : {}),
    uid,
    email,
    userId: uid,
    userEmail: email,
    ip: data.ip || ctx.ip,
    userAgent: ctx.userAgent,
    platform: data.platform || "",
    browser: data.browser || "",
    operatingSystem: data.operatingSystem || "",
    language: data.language || "pt-BR",
    timezone: ctx.timezone,
    country: ctx.country,
    city: ctx.city,
    region: ctx.region,
    ipVersion: ctx.ipVersion,
    requestId: ctx.requestId,
    timestamp: data.timestamp || timestamp,
    sessionId: data.sessionId || `sess_${uid}_${timestamp}`,
    anonymous: isAnon
  };
}
