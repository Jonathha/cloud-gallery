import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { motion } from 'motion/react';
import { authPrimary } from '../../../firebase';
import {
  BrowserNotificationStatus,
  disableChatBrowserNotifications,
  enableChatBrowserNotifications,
  getBrowserNotificationStatus,
  showChatBrowserNotification
} from '../../../utils/chatBrowserNotifications';

export function BrowserNotificationCard() {
  const [status, setStatus] = useState<BrowserNotificationStatus>(() => getBrowserNotificationStatus());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => setStatus(getBrowserNotificationStatus());
    window.addEventListener('cg_chat_notifications_changed', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('cg_chat_notifications_changed', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('show-app-toast', { detail: { message, type } }));
  };

  const handleToggle = async () => {
    if (busy || status === 'unsupported') return;
    setBusy(true);
    try {
      const currentUser = authPrimary.currentUser;
      if (status === 'enabled') {
        await disableChatBrowserNotifications(currentUser);
        setStatus(getBrowserNotificationStatus());
        showToast('Notificações do navegador desativadas.', 'success');
      } else {
        const result = await enableChatBrowserNotifications(currentUser);
        setStatus(result.status);
        if (result.ok) {
          showToast('Notificações do navegador ativadas para o Chat Global.', 'success');
        } else {
          showToast(result.error || 'Não foi possível ativar as notificações.', 'error');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    if (status !== 'enabled') return;
    const shown = await showChatBrowserNotification({
      userName: 'Chat Global',
      body: 'Notificações do navegador ativadas com sucesso.'
    });
    if (!shown) {
      showToast('Não foi possível exibir a notificação de teste.', 'error');
    }
  };

  const isEnabled = status === 'enabled';
  const isDenied = status === 'denied';
  const isUnsupported = status === 'unsupported';

  let description = 'Receba alertas do navegador quando chegar uma mensagem no Chat Global.';
  if (isEnabled) {
    description = 'Alertas ativados para novas mensagens no Chat Global.';
  } else if (isDenied) {
    description = 'Permissão bloqueada. Libere as notificações nas configurações do navegador.';
  } else if (isUnsupported) {
    description = 'Este navegador não suporta notificações.';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 bg-zinc-900/40 border border-white/10 rounded-2xl flex items-center justify-between gap-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Bell size={18} className="text-zinc-200" />
          ) : (
            <BellOff size={18} className="text-zinc-400" />
          )}
          <h3 className="text-sm font-semibold text-white">Notificações no Navegador</h3>
        </div>
        <p className="text-xs text-zinc-400">{description}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isEnabled && (
          <button
            type="button"
            onClick={handleTest}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-xl text-xs transition-all border border-white/10 cursor-pointer"
          >
            Testar
          </button>
        )}
        <button
          type="button"
          disabled={busy || isUnsupported || isDenied}
          onClick={handleToggle}
          className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl text-xs transition-all border border-white/10 cursor-pointer"
        >
          {isEnabled ? 'Desativar' : isDenied ? 'Bloqueado' : 'Ativar'}
        </button>
      </div>
    </motion.div>
  );
}

export default BrowserNotificationCard;
