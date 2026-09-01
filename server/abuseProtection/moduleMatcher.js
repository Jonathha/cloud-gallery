async function hashToken(token) {
  const msgBuffer = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getModuleAndId(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '0.0.0.0';
  const url = new URL(request.url);
  const path = url.pathname;

  let authIdentifier = ip;
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    authIdentifier = await hashToken(token);
  }

  if (path.startsWith('/api/roulette')) {
    return { module: 'roulette', id: authIdentifier, ip };
  } else if (path.startsWith('/api/admin/roulette')) {
    return { module: 'admin_roulette', id: authIdentifier, ip };
  } else if (path.startsWith('/api/logs')) {
    return { module: 'logs', id: authIdentifier, ip };
  } else if (path.startsWith('/api/share/view') || path.startsWith('/api/share_view') || path.startsWith('/share')) {
    return { module: 'share_view', id: ip, ip };
  } else if (path === '/api/share/create' || path.startsWith('/api/share_create')) {
    return { module: 'share_create', id: authIdentifier, ip };
  } else if (path.startsWith('/api/share') || path.startsWith('/api/share_manage')) {
    return { module: 'share_manage', id: authIdentifier, ip };
  } else if (path.startsWith('/api/auth')) {
    return { module: 'auth', id: ip, ip };
  } else if (path.includes('/upload')) {
    return { module: 'upload', id: authIdentifier, ip };
  } else if (path.startsWith('/api/storage')) {
    return { module: 'storage', id: authIdentifier, ip };
  } else if (path.startsWith('/api/guarly') || path.startsWith('/api/chat')) {
    return { module: 'chat', id: authIdentifier, ip };
  }

  return { module: 'general', id: ip, ip };
}
