import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SettingsMenuProps {
  tabs: any[];
  onOpenTrash?: () => void;
  isInline?: boolean;
  handleClose: () => void;
  setActiveTab: (tab: any) => void;
  ICON_MAP: Record<string, any>;
  hasAnimated?: boolean;
}

const CATEGORY_GROUPS = [
  {
    title: 'Segurança & Privacidade',
    ids: ['security', 'decoyVault', 'fakeVault', 'control']
  },
  {
    title: 'Armazenamento & Manutenção',
    ids: ['storage', 'repair']
  },
  {
    title: 'Conta & Aplicativo',
    ids: ['account', 'appearance', 'installApp', 'about']
  }
];

export function SettingsMenu({
  tabs,
  onOpenTrash,
  isInline,
  handleClose,
  setActiveTab,
  ICON_MAP,
  hasAnimated = false,
}: SettingsMenuProps) {
  return (
    <motion.div
      key="menu"
      initial={hasAnimated ? false : { opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="p-4 pb-28 md:pb-8 space-y-6 max-w-2xl mx-auto w-full"
    >
      {CATEGORY_GROUPS.map((group) => {
        const groupTabs = tabs.filter(t => group.ids.includes(t.id));
        if (groupTabs.length === 0) return null;

        return (
          <div key={group.title} className="space-y-2">
            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider px-2">
              {group.title}
            </h4>
            <div className="space-y-1 bg-zinc-900/30 rounded-2xl p-1.5 border border-white/5">
              {groupTabs.map((tab, i) => {
                const Icon = ICON_MAP[tab.icon] || Sparkles;
                return (
                  <motion.button
                    initial={hasAnimated ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: hasAnimated ? 0 : i * 0.03, duration: 0.2 }}
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'trash') {
                        onOpenTrash?.();
                        if (!isInline) handleClose();
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className="w-full flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl transition-all hover:bg-white/5 active:bg-white/10 text-left group"
                  >
                    <div className="p-2.5 bg-zinc-900 rounded-xl border border-white/5 text-zinc-400 group-hover:text-white group-hover:border-white/10 transition-colors shrink-0">
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm sm:text-base leading-tight">{tab.label}</h3>
                      <p className="text-xs sm:text-sm text-zinc-500 line-clamp-1 mt-0.5">{tab.description}</p>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
