export function isShareActive(data, now = Date.now()) {
  if (!data || (!data.id && !data.shareId)) return false;
  if (data.status === 'failed' || data.status === 'revoked') return false;
  if (data.status === 'pending') {
    const createdAt = Number(data.createdAt || data.updatedAt || 0);
    if (createdAt && (now - createdAt > 60000)) {
      return false;
    }
    return true;
  }
  if (data.options?.expiresAt && Number(data.options.expiresAt) <= now) {
    return false;
  }
  if (data.options?.oneTimeView && data.firstViewedAt && (now - Number(data.firstViewedAt) > 60000)) {
    return false;
  }
  return true;
}

export function extractIdFromUrl(urlOrReq) {
  let pathname = "";
  if (typeof urlOrReq === "string") {
    pathname = urlOrReq;
  } else if (urlOrReq instanceof URL) {
    pathname = urlOrReq.pathname;
  } else if (urlOrReq && urlOrReq.url) {
    try {
      pathname = new URL(urlOrReq.url).pathname;
    } catch {
      pathname = String(urlOrReq.url);
    }
  }
  const id = pathname.split("/").pop();
  return id || "";
}

export function isValidShareId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]+$/.test(id);
}

export function getClientIp(request) {
  if (!request || !request.headers) return "0.0.0.0";
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for")
      ? request.headers.get("x-forwarded-for").split(",")[0].trim()
      : "0.0.0.0")
  );
}
