import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Check, Palette } from 'lucide-react';
import { getStoredTheme, applyTheme, AppTheme } from '../../utils/theme';

interface AppearanceTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AppearanceTab({ showToast }: AppearanceTabProps) {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(getStoredTheme());
    };
    window.addEventListener('app-theme-changed', handleThemeChange);
    return () => window.removeEventListener('app-theme-changed', handleThemeChange);
  }, []);

  const handleSelectTheme = (theme: AppTheme) => {
    if (theme === currentTheme) return;
    applyTheme(theme);
    setCurrentTheme(theme);
    showToast(
      theme === 'light' ? 'Tema claro ativado' : 'Tema padrão (preto) ativado',
      'success'
    );
  };

  return (
    <div className="space-y-6 text-left pb-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <Palette size={20} className="text-zinc-300" />
          <h3 className="text-lg font-semibold text-white">Aparência & Tema</h3>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          Personalize as cores e a interface visual do seu aplicativo.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Dark (Padrão) Option */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => handleSelectTheme('dark')}
          className={`theme-preserve-dark relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-4 group overflow-hidden ${
            currentTheme === 'dark'
              ? 'bg-zinc-900 border-white/30 shadow-lg shadow-black/50 ring-2 ring-white/20'
              : 'bg-zinc-900/40 border-white/10 hover:border-white/20 hover:bg-zinc-900/60'
          }`}
        >
          {/* Visual Preview Box */}
          <div className="w-full h-24 rounded-xl bg-black border border-white/10 p-2.5 flex flex-col justify-between space-y-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-2 w-16 bg-zinc-800 rounded-full" />
              <div className="h-3 w-3 rounded-full bg-zinc-700" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-zinc-900 rounded" />
              <div className="h-2 w-3/4 bg-zinc-900/80 rounded" />
            </div>
            <div className="flex gap-1.5 pt-1">
              <div className="h-5 w-5 bg-zinc-800 rounded-md" />
              <div className="h-5 w-5 bg-zinc-800 rounded-md" />
              <div className="h-5 w-5 bg-zinc-800 rounded-md" />
            </div>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Moon size={16} className="text-zinc-300 shrink-0" />
                <h4 className="font-semibold text-white text-sm sm:text-base">Padrão (Preto)</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Interface com tom escuro e elegante. Maior conforto visual e economia de energia.
              </p>
            </div>
            {currentTheme === 'dark' && (
              <div className="p-1.5 bg-white text-black rounded-full shrink-0 shadow-sm mt-0.5">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </div>
        </motion.button>

        {/* Light (Branco) Option */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => handleSelectTheme('light')}
          className={`theme-preserve-light relative p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-4 group overflow-hidden ${
            currentTheme === 'light'
              ? 'bg-white border-slate-300 shadow-md ring-2 ring-slate-400/30'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
          }`}
        >
          {/* Visual Preview Box */}
          <div className="w-full h-24 rounded-xl bg-slate-100 border border-slate-200 p-2.5 flex flex-col justify-between space-y-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="h-2 w-16 bg-slate-300 rounded-full" />
              <div className="h-3 w-3 rounded-full bg-slate-400" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-white rounded shadow-2xs" />
              <div className="h-2 w-3/4 bg-white/90 rounded shadow-2xs" />
            </div>
            <div className="flex gap-1.5 pt-1">
              <div className="h-5 w-5 bg-white rounded-md shadow-2xs" />
              <div className="h-5 w-5 bg-white rounded-md shadow-2xs" />
              <div className="h-5 w-5 bg-white rounded-md shadow-2xs" />
            </div>
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sun size={16} className="text-amber-500 shrink-0" />
                <h4 className="font-semibold text-slate-900 text-sm sm:text-base">Claro (Branco)</h4>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Interface clara e limpa no estilo iOS/sistema com alta legibilidade em locais iluminados.
              </p>
            </div>
            {currentTheme === 'light' && (
              <div className="p-1.5 bg-slate-900 text-white rounded-full shrink-0 shadow-sm mt-0.5">
                <Check size={14} strokeWidth={3} />
              </div>
            )}
          </div>
        </motion.button>
      </div>
    </div>
  );
}
