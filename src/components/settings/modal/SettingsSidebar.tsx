import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { CATEGORY_GROUPS, ICON_MAP } from './types';

interface SettingsSidebarProps {
  tabs: Array<{ id: string; label: string; icon: string }>;
  activeTab: string;
  setActiveTab: (tabId: any) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  tabs,
  activeTab,
  setActiveTab
}) => {
  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 border-r border-white/5 bg-[#080808] shrink-0 overflow-y-auto p-4 space-y-5 select-none">
      <div className="px-2 pt-2 pb-1 border-b border-white/5">
        <h2 className="text-lg font-bold text-white tracking-tight">Configurações</h2>
        <p className="text-xs text-zinc-500">Ajustes do cofre e conta</p>
      </div>

      {CATEGORY_GROUPS.map((group) => {
        const groupTabs = tabs.filter(t => group.ids.includes(t.id));
        if (groupTabs.length === 0) return null;

        return (
          <div key={group.title} className="space-y-1">
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 mb-1.5">
              {group.title}
            </h4>
            {groupTabs.map((tab) => {
              const Icon = (ICON_MAP as any)[tab.icon] || Sparkles;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 text-left group active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-settings-tab"
                      className="absolute inset-0 bg-white/10 rounded-xl border border-white/10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon size={16} className={`relative z-10 transition-colors ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span className="relative z-10 truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </aside>
  );
};
