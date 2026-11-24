import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, BellOff, MessageSquare } from 'lucide-react';
import { authPrimary } from '../../firebase';
import { isNativeApp } from '../../utils/isNativeApp';
import {
  BrowserNotificationStatus,
  disableChatBrowserNotifications,
  enableChatBrowserNotifications,
  getBrowserNotificationStatus,
  isBrowserNotificationsSupported
} from '../../utils/chatBrowserNotifications';

interface ChatHeaderProps {
  onBackToGallery?: () => void;
}

export default function ChatHeader({ onBackToGallery }: ChatHeaderProps) {
  const isApp = isNativeApp();
  const supported = !isApp && isBrowserNotificationsSupported();
  const [notifStatus, setNotifStatus] = useState<BrowserNotificationStatus>(() => getBrowserNotificationStatus());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const syncStatus = () => setNotifStatus(getBrowserNotificationStatus());
    window.addEventListener('cg_chat_notifications_changed', syncStatus);
    window.addEventListener('focus', syncStatus);
    return () => {
      window.removeEventListener('cg_chat_notifications_changed', syncStatus);
      window.removeEventListener('focus', syncStatus);
    };
  }, [supported]);

  const handleToggleNotifications = async () => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      const user = authPrimary.currentUser;
      if (notifStatus === 'enabled') {
        await disableChatBrowserNotifications(user);
        setNotifStatus(getBrowserNotificationStatus());
        window.dispatchEvent(
          new CustomEvent('show-app-toast', {
            detail: { message: 'Notificações do navegador desativadas.', type: 'success' }
          })
        );
      } else {
        const res = await enableChatBrowserNotifications(user);
        setNotifStatus(res.status);
        window.dispatchEvent(
          new CustomEvent('show-app-toast', {
            detail: {
              message: res.ok
                ? 'Notificações ativadas para novas mensagens.'
                : res.error || 'Não foi possível ativar as notificações.',
              type: res.ok ? 'success' : 'error'
            }
          })
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const isEnabled = notifStatus === 'enabled';
  const isDenied = notifStatus === 'denied';
  const buttonTitle = isEnabled
    ? 'Desativar notificações do navegador'
    : isDenied
      ? 'Notificações bloqueadas nas configurações do navegador'
      : 'Ativar notificações no navegador';

  return (
    <div 
      style={{
        paddingTop: isApp ? '2.5rem' : 'calc(0.8rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.8rem'
      }}
      className="px-4 bg-zinc-950/80 border-b border-white/[0.06] flex items-center justify-between gap-3 shrink-0 sticky top-0 z-10 backdrop-blur-md min-h-14"
    >
      <div className="flex items-center min-w-0">
        {onBackToGallery && (
          <button 
            onClick={onBackToGallery}
            className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-400 mr-2 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-200 mr-3 shrink-0">
          <MessageSquare size={17} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100">Chat Global</h2>
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide">Mensagens em tempo real</p>
        </div>
      </div>

      {supported && (
        <button
          type="button"
          onClick={handleToggleNotifications}
          disabled={busy || isDenied}
          title={buttonTitle}
          aria-label={buttonTitle}
          className={`p-2 rounded-xl border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
            isEnabled
              ? 'bg-white/10 border-white/20 text-zinc-100 hover:bg-white/15'
              : 'bg-white/[0.04] border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
          }`}
        >
          {isEnabled ? <Bell size={17} /> : <BellOff size={17} />}
        </button>
      )}
    </div>
  );
}
