import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Palette } from 'lucide-react';
import { getStoredTheme, applyTheme, AppTheme } from '../../utils/theme';
import ThemeOptionCard from './appearance/ThemeOptionCard';

interface AppearanceTabProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AppearanceTab({ showToast }: AppearanceTabProps) {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getStoredTheme);

  useEffect(() => {
    const handleThemeChange = () => setCurrentTheme(getStoredTheme());
    window.addEventListener('app-theme-changed', handleThemeChange);
    return () => window.removeEventListener('app-theme-changed', handleThemeChange);
  }, []);

  const handleSelectTheme = (theme: AppTheme) => {
    if (theme === currentTheme) return;
    applyTheme(theme);
    setCurrentTheme(theme);
    showToast(
      theme === 'light' ? 'Modo Claro ativado' : 'Modo Escuro ativado',
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
          <h3 className="text-lg font-semibold text-white">Aparência</h3>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          Personalize as cores e a experiência visual da interface.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ThemeOptionCard
          id="dark"
          title="Modo Escuro"
          badge="Padrão"
          description="Contraste profundo e tons escuros. Ideal para maior conforto visual e economia de energia."
          icon={Moon}
          iconColor="text-zinc-300"
          isSelected={currentTheme === 'dark'}
          onSelect={() => handleSelectTheme('dark')}
          delay={0.05}
        />

        <ThemeOptionCard
          id="light"
          title="Modo Claro"
          description="Interface iluminada e de alto contraste. Ideal para ambientes claros e leitura sob luz solar."
          icon={Sun}
          iconColor="text-amber-500"
          isSelected={currentTheme === 'light'}
          onSelect={() => handleSelectTheme('light')}
          delay={0.1}
        />
      </div>
    </div>
  );
}
