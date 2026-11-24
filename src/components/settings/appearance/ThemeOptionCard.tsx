import React from 'react';
import { motion } from 'motion/react';
import { Check, LucideIcon } from 'lucide-react';

interface ThemeOptionCardProps {
  id: 'dark' | 'light';
  title: string;
  badge?: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  isSelected: boolean;
  onSelect: () => void;
  delay?: number;
}

export default function ThemeOptionCard({
  id,
  title,
  badge,
  description,
  icon: Icon,
  iconColor,
  isSelected,
  onSelect,
  delay = 0,
}: ThemeOptionCardProps) {
  const isDark = id === 'dark';

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.18 }}
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`relative p-4 sm:p-5 rounded-2xl border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer flex flex-col justify-between space-y-4 group overflow-hidden ${
        isDark ? 'theme-preserve-dark' : 'theme-preserve-light'
      } ${
        isDark
          ? isSelected
            ? 'bg-zinc-900/90 border-white/40 shadow-xl shadow-black/60 ring-2 ring-white/20'
            : 'bg-zinc-950/60 border-white/10 hover:border-white/25 hover:bg-zinc-900/40'
          : isSelected
          ? 'bg-white border-zinc-400/80 shadow-md ring-2 ring-zinc-900/15'
          : 'bg-zinc-100/70 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100'
      }`}
    >
      {/* Visual Mockup Preview */}
      <div
        className={`w-full h-24 rounded-xl border p-2.5 flex flex-col justify-between overflow-hidden transition-transform duration-200 group-hover:scale-[1.01] ${
          isDark ? 'bg-black/90 border-white/[0.08]' : 'bg-white border-zinc-200/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className={`h-2 w-16 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
          <div className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
        </div>
        <div className="space-y-1.5">
          <div className={`h-2 w-full rounded ${isDark ? 'bg-zinc-900' : 'bg-zinc-100'}`} />
          <div className={`h-2 w-3/5 rounded ${isDark ? 'bg-zinc-900/70' : 'bg-zinc-100/80'}`} />
        </div>
        <div className="flex gap-1.5 pt-0.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-5 w-5 rounded-md ${
                isDark ? 'bg-zinc-800' : 'bg-zinc-100 border border-zinc-200/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Info & Selection Indicator */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon size={16} className={`${iconColor} shrink-0`} />
            <h4 className={`font-semibold text-sm sm:text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {title}
            </h4>
            {badge && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                isDark ? 'bg-zinc-800 text-zinc-300 border border-white/10' : 'bg-zinc-200/70 text-zinc-700 border border-zinc-300'
              }`}>
                {badge}
              </span>
            )}
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {description}
          </p>
        </div>

        {/* Sempre renderizado (só a opacidade muda) para o texto não reflowar e o card não mudar de altura ao selecionar */}
        <div aria-hidden="true" className={`p-1.5 rounded-full shrink-0 shadow-sm mt-0.5 transition-opacity duration-150 ${
          isSelected ? 'opacity-100' : 'opacity-0'
        } ${
          isDark ? 'bg-white text-zinc-950' : 'bg-zinc-950 text-white'
        }`}>
          <Check size={13} strokeWidth={3} />
        </div>
      </div>
    </motion.button>
  );
}
