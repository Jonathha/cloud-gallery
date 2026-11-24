// Global Chat Web Push & Notification Click handler (imported by VitePWA sw.js)
const CHAT_STATE_CACHE = 'cg-chat-state';
const CHAT_VISIBLE_KEY = '/__chat_visible_state';

async function isChatCurrentlyFocused(windowClients) {
  const hasFocusedWindow = windowClients.some((client) => {
    try {
      return client.visibilityState === 'visible' && client.focused;
    } catch {
      return false;
    }
  });
  if (!hasFocusedWindow || typeof caches === 'undefined') return false;

  try {
    const cache = await caches.open(CHAT_STATE_CACHE);
    const res = await cache.match(CHAT_VISIBLE_KEY);
    if (!res) return false;
    const data = await res.json().catch(() => null);
    return !!(data && data.active === true && Date.now() - Number(data.ts || 0) < 120000);
  } catch {
    return false;
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch {
      payload = { body: event.data ? event.data.text() : '' };
    }

    const title = payload.title || 'Chat Global';
    const body = payload.body || 'Nova mensagem no Chat Global';
    const messageId = payload.messageId || '';
    const tag = payload.tag || (messageId ? `chat-msg-${messageId}` : `chat-msg-${Date.now()}`);
    const targetUrl = payload.url || '/?tab=chat';

    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windowClients) {
      try {
        client.postMessage({ type: 'CHAT_PUSH_RECEIVED', messageId });
      } catch {}
    }

    if (await isChatCurrentlyFocused(windowClients)) {
      return;
    }

    await self.registration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag,
      renotify: false,
      data: { url: targetUrl, messageId }
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/?tab=chat';
  const messageId = data.messageId || '';

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      try {
        if (new URL(client.url).origin === self.location.origin) {
          if ('focus' in client) await client.focus();
          client.postMessage({ type: 'OPEN_CHAT_FROM_NOTIFICATION', messageId });
          return;
        }
      } catch {}
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});
