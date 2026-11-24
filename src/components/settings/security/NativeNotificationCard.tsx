import React from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { requestNativeNotificationPermission, sendNativeNotification } from '../../../utils/nativeNotifications';

export function NativeNotificationCard() {
  const handleTestNotification = () => {
    requestNativeNotificationPermission();
    setTimeout(() => {
      sendNativeNotification("Teste do Cofre", "Notificações ativas com sucesso!");
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 bg-zinc-900/40 border border-white/10 rounded-2xl flex items-center justify-between gap-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-zinc-300" />
          <h3 className="text-sm font-semibold text-white">Notificações Nativas</h3>
        </div>
        <p className="text-xs text-zinc-400">
          Testar envio de alertas no sistema.
        </p>
      </div>

      <button
        type="button"
        onClick={handleTestNotification}
        className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl text-xs transition-all border border-white/10 shrink-0 cursor-pointer"
      >
        Testar
      </button>
    </motion.div>
  );
}

export default NativeNotificationCard;
