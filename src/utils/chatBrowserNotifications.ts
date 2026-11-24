import { getApiUrl } from './apiUrl';
import { isNativeApp } from './isNativeApp';

const PREF_STORAGE_KEY = 'cg_chat_browser_notifications_v1';
const CHAT_STATE_CACHE = 'cg-chat-state';
const CHAT_VISIBLE_KEY = '/__chat_visible_state';

export type BrowserNotificationStatus = 'unsupported' | 'denied' | 'enabled' | 'disabled';

export function isBrowserNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && !isNativeApp();
}

export function isWebPushSupported(): boolean {
  return (
    isBrowserNotificationsSupported() &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export function getBrowserNotificationPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PREF_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setBrowserNotificationPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREF_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('cg_chat_notifications_changed', { detail: { enabled } })
    );
  } catch {}
}

export function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (!isBrowserNotificationsSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission === 'granted' && getBrowserNotificationPreference()) {
    return 'enabled';
  }
  return 'disabled';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export async function setChatWindowVisibilityCache(active: boolean): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CHAT_STATE_CACHE);
    const body = JSON.stringify({ active, ts: Date.now() });
    await cache.put(
      CHAT_VISIBLE_KEY,
      new Response(body, { headers: { 'Content-Type': 'application/json' } })
    );
  } catch {}
}

export async function syncWebPushSubscription(user: any): Promise<boolean> {
  if (!user || !isWebPushSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration || !registration.pushManager) {
    return false;
  }

  const idToken = await user.getIdToken();
  const keyRes = await fetch(getApiUrl('/api/chat/push/vapid-key'), {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  const keyData = await keyRes.json().catch(() => ({}));
  if (!keyRes.ok || !keyData.publicKey) {
    return false;
  }

  const expectedKeyBytes = urlBase64ToUint8Array(keyData.publicKey);
  let subscription = await registration.pushManager.getSubscription();

  if (subscription && subscription.options?.applicationServerKey) {
    const existingKeyBytes = new Uint8Array(subscription.options.applicationServerKey);
    if (!uint8ArraysEqual(existingKeyBytes, expectedKeyBytes)) {
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: expectedKeyBytes
    });
  }

  const subJson = subscription.toJSON();
  const endpoint = subJson.endpoint;
  const p256dh = subJson.keys?.p256dh;
  const auth = subJson.keys?.auth;
  if (!endpoint || !p256dh || !auth) return false;

  const subRes = await fetch(getApiUrl('/api/chat/push/subscribe'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ endpoint, keys: { p256dh, auth } })
  });

  return subRes.ok;
}

export async function syncWebPushIfEnabled(user: any): Promise<void> {
  if (getBrowserNotificationStatus() !== 'enabled') return;
  try {
    await syncWebPushSubscription(user);
  } catch {}
}

export async function enableChatBrowserNotifications(user: any): Promise<{
  ok: boolean;
  status: BrowserNotificationStatus;
  pushSynced: boolean;
  error?: string;
}> {
  if (!isBrowserNotificationsSupported()) {
    return {
      ok: false,
      status: 'unsupported',
      pushSynced: false,
      error: 'Este navegador não suporta notificações.'
    };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    setBrowserNotificationPreference(false);
    return {
      ok: false,
      status: permission === 'denied' ? 'denied' : 'disabled',
      pushSynced: false,
      error:
        permission === 'denied'
          ? 'Permissão bloqueada nas configurações do navegador.'
          : 'Permissão para notificações não concedida.'
    };
  }

  setBrowserNotificationPreference(true);
  const pushSynced = user ? await syncWebPushSubscription(user).catch(() => false) : false;

  return {
    ok: true,
    status: 'enabled',
    pushSynced
  };
}

export async function disableChatBrowserNotifications(user: any): Promise<void> {
  setBrowserNotificationPreference(false);
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;

    if (user) {
      const idToken = await user.getIdToken();
      await fetch(getApiUrl('/api/chat/push/unsubscribe'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      }).catch(() => {});
    }

    await subscription.unsubscribe().catch(() => {});
  } catch {}
}

export async function showChatBrowserNotification(params: {
  messageId?: string;
  userName?: string;
  body: string;
}): Promise<boolean> {
  if (getBrowserNotificationStatus() !== 'enabled') return false;

  const title = params.userName || 'Chat Global';
  const tag = params.messageId ? `chat-msg-${params.messageId}` : `chat-msg-${Date.now()}`;
  const options: NotificationOptions & { renotify?: boolean } = {
    body: params.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag,
    renotify: false,
    data: { url: '/?tab=chat', messageId: params.messageId || '' }
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(title, options);
        return true;
      }
    } catch {}
  }

  try {
    const notification = new Notification(title, {
      body: params.body,
      icon: '/icon.svg',
      tag
    });
    notification.onclick = () => {
      try {
        window.focus();
      } catch {}
      window.dispatchEvent(new CustomEvent('guarly_navigate_tab', { detail: 'chat' }));
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}
