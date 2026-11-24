import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginAlertsProps {
  error: string | null;
  message: string | null;
}

export const LoginAlerts: React.FC<LoginAlertsProps> = ({ error, message }) => {
  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div 
          key="error-alert"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/25 py-2.5 px-3 rounded-xl whitespace-pre-line leading-relaxed shadow-sm">
            {error}
          </div>
        </motion.div>
      )}

      {message && (
        <motion.div 
          key="message-alert"
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="text-zinc-300 text-xs text-center font-medium bg-white/10 border border-white/15 py-2.5 px-3 rounded-xl whitespace-pre-line leading-relaxed shadow-sm">
            {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
