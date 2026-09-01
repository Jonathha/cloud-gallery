export function extractClientContext(request, body) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "0.0.0.0";
  const userAgent = request.headers.get("User-Agent") || "";
  const country = request.headers.get("cf-ipcountry") || request.cf?.country || "Desconhecido";
  const city = request.headers.get("cf-ipcity") || request.cf?.city || "Desconhecido";
  const region = request.headers.get("cf-region") || request.cf?.region || "Desconhecido";
  const timezone = request.headers.get("cf-timezone") || request.cf?.timezone || body.data?.timeZone || "UTC";
  const ipVersion = ip.includes(":") ? "IPv6" : "IPv4";
  const requestId = request.headers.get("cf-ray") || crypto.randomUUID();

  return {
    ip,
    userAgent,
    country,
    city,
    region,
    timezone,
    ipVersion,
    requestId
  };
}

export function buildUserAccessDoc(verifiedUser, data, ctx, timestamp) {
  let uid, email, displayName, isAnon, provider;

  if (verifiedUser) {
    uid = verifiedUser.uid;
    email = verifiedUser.email || "Usuário Sem E-mail";
    displayName = verifiedUser.displayName || (email.includes("@") ? email.split("@")[0] : "Usuário");
    isAnon = false;
    provider = data.provider || "google/firebase";
  } else {
    // Quando verifiedUser é nulo, identidade é obrigatoriamente anônima
    uid = "anonymous";
    email = "Anônimo";
    displayName = "Visitante Anônimo";
    isAnon = true;
    provider = "anonymous";
  }

  const sessionId = data.sessionId || `sess_${uid}_${timestamp}`;

  return {
    docData: {
      uid,
      email,
      displayName,
      provider,
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
      loginAt: data.loginAt || timestamp,
      lastSeen: timestamp,
      online: data.online !== undefined ? !!data.online : true,
      anonymous: isAnon,
      sessionId,
      firstAccess: data.firstAccess || timestamp,
      accessCount: data.accessCount || 1
    },
    docId: uid.replace(/[^a-zA-Z0-9_-]/g, "_")
  };
}
