import { useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../utils/apiUrl';
import { decryptData } from '../utils/crypto';
import { isNativeApp } from '../utils/isNativeApp';
import { getDerivedChatKey } from '../components/chat/chatAuthHelpers';
import { timestamp } from '../components/chat/messages/messagesCache';
import { ChatMessage } from '../components/chat/types';
import {
  getBrowserNotificationStatus,
  setChatWindowVisibilityCache,
  showChatBrowserNotification,
  syncWebPushIfEnabled
} from '../utils/chatBrowserNotifications';

const VISIBLE_POLL_MS = 4000;
const HIDDEN_POLL_MS = 8000;

function formatAudioDuration(ms?: number): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '';
  const total = Math.max(1, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

async function buildNotificationBody(
  msg: ChatMessage,
  chatKeyRef: { current: CryptoKey | null }
): Promise<string> {
  if (msg.mediaType === 'audio') {
    const dur = formatAudioDuration(msg.audioDurationMs);
    return dur ? `Enviou um áudio (${dur})` : 'Enviou uma mensagem de voz';
  }

  let text = typeof msg.text === 'string' ? msg.text.trim() : '';
  if (!text && msg.textCiphertext && msg.textIv) {
    try {
      if (!chatKeyRef.current) {
        chatKeyRef.current = await getDerivedChatKey();
      }
      text = (await decryptData(msg.textCiphertext, msg.textIv, chatKeyRef.current)).trim();
    } catch {
      text = '';
    }
  }

  if (!text) return 'Nova mensagem no Chat Global';
  const chars = [...text];
  return chars.length > 140 ? chars.slice(0, 137).join('') + '...' : text;
}

export function useChatBrowserNotifications(
  user: any,
  activeTab: string,
  onOpenChatTab: () => void
) {
  const isApp = isNativeApp();
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const onOpenChatTabRef = useRef(onOpenChatTab);
  onOpenChatTabRef.current = onOpenChatTab;

  const seenIdsRef = useRef<Set<string>>(new Set());
  const chatKeyRef = useRef<CryptoKey | null>(null);
  const [statusTick, setStatusTick] = useState(0);

  // Navigate to chat tab when opened from /?tab=chat (e.g. notification click in new window)
  useEffect(() => {
    if (!user || isApp) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'chat') {
      onOpenChatTabRef.current();
      params.delete('tab');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, [user, isApp]);

  // Keep Service Worker cache aware of whether the user is currently staring at ChatTab
  useEffect(() => {
    if (!user || isApp) return;
    const updateCache = () => {
      const isFocusedChat =
        activeTabRef.current === 'chat' &&
        document.visibilityState === 'visible' &&
        document.hasFocus();
      void setChatWindowVisibilityCache(isFocusedChat);
    };

    updateCache();
    window.addEventListener('focus', updateCache);
    window.addEventListener('blur', updateCache);
    document.addEventListener('visibilitychange', updateCache);

    return () => {
      window.removeEventListener('focus', updateCache);
      window.removeEventListener('blur', updateCache);
      document.removeEventListener('visibilitychange', updateCache);
      void setChatWindowVisibilityCache(false);
    };
  }, [user, isApp, activeTab]);

  // Listen to Service Worker messages, active chat seen events, and notification toggle changes
  useEffect(() => {
    if (!user || isApp) return;

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'OPEN_CHAT_FROM_NOTIFICATION') {
        onOpenChatTabRef.current();
      } else if (data.type === 'CHAT_PUSH_RECEIVED' && typeof data.messageId === 'string' && data.messageId) {
        seenIdsRef.current.add(data.messageId);
      }
    };

    const handleMessagesSeen = (event: Event) => {
      const ids = (event as CustomEvent<string[]>).detail;
      if (!Array.isArray(ids)) return;
      for (const id of ids) {
        if (typeof id === 'string' && id) {
          seenIdsRef.current.add(id);
        }
      }
      if (seenIdsRef.current.size > 400) {
        const recent = Array.from(seenIdsRef.current).slice(-200);
        seenIdsRef.current = new Set(recent);
      }
    };

    const handlePreferenceChanged = () => {
      setStatusTick((t) => t + 1);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    window.addEventListener('cg_chat_messages_seen', handleMessagesSeen);
    window.addEventListener('cg_chat_notifications_changed', handlePreferenceChanged);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      window.removeEventListener('cg_chat_messages_seen', handleMessagesSeen);
      window.removeEventListener('cg_chat_notifications_changed', handlePreferenceChanged);
    };
  }, [user, isApp]);

  // Background watcher: sync Web Push and watch /api/chat/version when enabled
  useEffect(() => {
    if (!user || isApp) return;
    if (getBrowserNotificationStatus() !== 'enabled') return;

    let cancelled = false;
    let timerId: number | null = null;
    let baselineVersion: number | null = null;
    let baselineTs = Date.now();
    let inFlight = false;

    void syncWebPushIfEnabled(user);

    const scheduleNext = () => {
      if (cancelled) return;
      const delay = document.visibilityState === 'visible' ? VISIBLE_POLL_MS : HIDDEN_POLL_MS;
      timerId = window.setTimeout(checkVersion, delay);
    };

    const checkVersion = async () => {
      if (cancelled || inFlight) {
        if (!cancelled) scheduleNext();
        return;
      }

      if (getBrowserNotificationStatus() !== 'enabled') return;

      inFlight = true;
      try {
        const token = await user.getIdToken();
        const verRes = await fetch(getApiUrl('/api/chat/version'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const verData = await verRes.json().catch(() => ({}));
        if (!verRes.ok || typeof verData.version !== 'number') {
          return;
        }

        if (baselineVersion === null) {
          baselineVersion = verData.version;
          baselineTs = Date.now();
          return;
        }

        if (verData.version === baselineVersion) {
          return;
        }

        baselineVersion = verData.version;

        const isViewingChat =
          activeTabRef.current === 'chat' &&
          document.visibilityState === 'visible' &&
          document.hasFocus();
        if (isViewingChat) {
          baselineTs = Date.now();
          return;
        }

        const msgRes = await fetch(getApiUrl('/api/chat/messages?limit=5'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        const msgData = await msgRes.json().catch(() => ({}));
        if (!msgRes.ok || !Array.isArray(msgData.messages)) {
          return;
        }

        const sorted = [...msgData.messages].sort(
          (a: ChatMessage, b: ChatMessage) => timestamp(a.createdAt) - timestamp(b.createdAt)
        );

        let maxTs = baselineTs;
        for (const msg of sorted) {
          if (!msg?.id) continue;
          const msgTs = timestamp(msg.createdAt);
          if (msgTs > maxTs) maxTs = msgTs;

          if (seenIdsRef.current.has(msg.id)) continue;
          seenIdsRef.current.add(msg.id);

          if (msg.userId === user.uid) continue;
          if (msgTs <= baselineTs) continue;

          const body = await buildNotificationBody(msg, chatKeyRef);
          if (cancelled) return;
          await showChatBrowserNotification({
            messageId: msg.id,
            userName: msg.userName,
            body
          });
        }
        baselineTs = maxTs;
      } catch {
        // Ignore transient network errors while background polling
      } finally {
        inFlight = false;
        scheduleNext();
      }
    };

    const handleVisibilityWake = () => {
      if (document.visibilityState === 'visible' && timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
        void checkVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityWake);
    void checkVersion();

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityWake);
    };
  }, [user, isApp, statusTick]);
}
