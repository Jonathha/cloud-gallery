import React, { useState, useEffect } from 'react';
import { EyeOff, Clock, Check, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { requestNativeNotificationPermission, sendNativeNotification, isAndroidNativeContainer } from '../../utils/nativeNotifications';

interface SecurityTabProps {
  privacyMode: boolean;
  handleTogglePrivacy: () => void;
  autoLockTimer: string;
  handleSaveTimer: (val: string) => void;
}

const PRESET_OPTIONS = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 h' },
  { value: 'never', label: 'Nunca' },
];

export default function SecurityTab({
  privacyMode,
  handleTogglePrivacy,
  autoLockTimer,
  handleSaveTimer
}: SecurityTabProps) {
  const isNative = isAndroidNativeContainer();
  const [customMinutes, setCustomMinutes] = useState<string>('');

  useEffect(() => {
    const isStandardPreset = PRESET_OPTIONS.some((p) => p.value === autoLockTimer);
    if (!isStandardPreset && autoLockTimer && autoLockTimer !== 'never') {
      setCustomMinutes(autoLockTimer);
    } else {
      setCustomMinutes('');
    }
  }, [autoLockTimer]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customMinutes, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 1440) {
      handleSaveTimer(String(parsed));
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Privacy Mode */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-zinc-900/40 border border-white/10 rounded-2xl flex items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <EyeOff size={18} className="text-zinc-300" />
            <h3 className="text-sm sm:text-base font-semibold text-white">Modo Privacidade</h3>
          </div>
          <p className="text-xs text-zinc-400">
            Oculta o conteúdo ao alternar de aplicativo ou minimizar.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            checked={privacyMode}
            onChange={handleTogglePrivacy}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
        </label>
      </motion.div>

      {/* Auto-Lock */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-4 sm:p-5 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-zinc-300" />
            <h3 className="text-sm sm:text-base font-semibold text-white">Bloqueio Automático</h3>
          </div>
          <p className="text-xs text-zinc-400">
            Tempo de inatividade antes de bloquear o cofre.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
          {PRESET_OPTIONS.map((preset) => {
            const active = autoLockTimer === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setCustomMinutes('');
                  handleSaveTimer(preset.value);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  active
                    ? 'bg-white text-black border-white shadow-sm'
                    : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 border-white/10'
                }`}
              >
                {active && <Check size={12} strokeWidth={2.5} />}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Minutes Input */}
        <form onSubmit={handleCustomSubmit} className="pt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="1"
              max="1440"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              placeholder="Digite em minutos (ex: 10)"
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0"
          >
            Salvar
          </button>
        </form>
      </motion.div>

      {/* Native Notifications (Android) */}
      {isNative && (
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
            onClick={() => {
              requestNativeNotificationPermission();
              setTimeout(() => {
                sendNativeNotification(
                  "Teste do Cofre", 
                  "Notificações ativas com sucesso!"
                );
              }, 500);
            }}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl text-xs transition-all border border-white/10 shrink-0 cursor-pointer"
          >
            Testar
          </button>
        </motion.div>
      )}
    </div>
  );
}


