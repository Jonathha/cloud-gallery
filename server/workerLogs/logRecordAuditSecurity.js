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
    platform: data.platform || "Unknown",
    browser: data.browser || "Unknown",
    operatingSystem: data.operatingSystem || "Unknown",
    language: data.language || "pt-BR",
    timezone: ctx.timezone,
    country: ctx.country,
    city: ctx.city,
    region: ctx.region,
    ipVersion: ctx.ipVersion,
    requestId: ctx.requestId,
    timestamp: data.timestamp || timestamp,
    sessionId: data.sessionId || `sess_${userId}_${timestamp}`,
    anonymous: isAnon
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
    uid,
    email,
    userId: uid,
    userEmail: email,
    ip: data.ip || ctx.ip,
    userAgent: ctx.userAgent,
    platform: data.platform || "Unknown",
    browser: data.browser || "Unknown",
    operatingSystem: data.operatingSystem || "Unknown",
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
