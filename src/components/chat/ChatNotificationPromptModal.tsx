import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { motion } from 'motion/react';
import {
  enableChatBrowserNotifications,
  getBrowserNotificationStatus
} from '../../utils/chatBrowserNotifications';
import { authPrimary } from '../../firebase';

const DISMISS_KEY = 'cg_chat_notif_prompt_dismissed_v1';

export interface ChatNotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatNotificationPromptModal({ isOpen, onClose }: ChatNotificationPromptModalProps) {
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = authPrimary.currentUser;
      const res = await enableChatBrowserNotifications(user);
      try {
        localStorage.setItem(DISMISS_KEY, 'true');
      } catch {}
      window.dispatchEvent(
        new CustomEvent('show-app-toast', {
          detail: {
            message: res.ok
              ? 'Notificações ativadas com sucesso!'
              : res.error || 'Não foi possível ativar as notificações.',
            type: res.ok ? 'success' : 'error'
          }
        })
      );
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#121212] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-left"
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-xl transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-200 mb-4">
          <Bell size={22} />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">Ativar Notificações do Chat?</h3>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Deseja receber alertas no navegador quando novos membros enviarem mensagens no Chat Global, mesmo quando estiver em outras abas?
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl text-sm transition-all border border-white/10 cursor-pointer"
          >
            Agora não
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleEnable}
            className="flex-1 px-4 py-3 bg-white text-black font-semibold rounded-xl text-sm transition-all hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
          >
            {busy ? 'Ativando...' : 'Ativar Notificações'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
