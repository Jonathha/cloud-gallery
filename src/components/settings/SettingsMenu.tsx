import React from 'react';
import { Sparkles } from 'lucide-react';
import { CATEGORY_GROUPS } from './modal/types';

interface SettingsMenuProps {
  tabs: any[];
  onOpenTrash?: () => void;
  isInline?: boolean;
  handleClose: () => void;
  setActiveTab: (tab: any) => void;
  ICON_MAP: Record<string, any>;
}

export function SettingsMenu({
  tabs,
  onOpenTrash,
  isInline,
  handleClose,
  setActiveTab,
  ICON_MAP,
}: SettingsMenuProps) {
  return (
    <div className="p-4 pb-28 space-y-6 max-w-2xl mx-auto w-full">
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
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'trash') {
                        onOpenTrash?.();
                        if (!isInline) handleClose();
                      } else {
                        setActiveTab(tab.id);
                      }
                    }}
                    className="w-full flex items-center gap-3.5 p-3 sm:p-3.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-all duration-150 hover:bg-white/5 active:bg-white/10 active:scale-[0.98] text-left group cursor-pointer select-none"
                  >
                    <div className="p-2.5 bg-zinc-900 rounded-xl border border-white/5 text-zinc-400 group-hover:text-white group-hover:border-white/10 group-active:scale-95 transition-all shrink-0">
                      <Icon size={20} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm sm:text-base leading-tight">{tab.label}</h3>
                      <p className="text-xs sm:text-sm text-zinc-500 line-clamp-2 mt-0.5">{tab.description}</p>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
