import React from 'react';
import { motion } from 'motion/react';

interface SettingsHeaderProps {
  isApp: boolean;
  activeTab: string;
  tabs: any[];
  setActiveTab: (tab: any) => void;
}

export function SettingsHeader({ isApp, activeTab, tabs, setActiveTab }: SettingsHeaderProps) {
  return (
    <header 
      style={{ paddingTop: isApp ? '2.5rem' : 'calc(0.5rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.5rem' }}
      className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 px-3 sm:px-6 min-h-14 sm:min-h-20 flex items-center justify-between shrink-0 select-none"
    >
      <div className="flex items-center gap-4">
        {activeTab !== 'menu' && (
          <button 
            onClick={() => setActiveTab('menu')}
            className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors text-white md:hidden"
          >
            <motion.div
              initial={{ x: 5, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </motion.div>
          </button>
        )}
        <div>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white leading-tight">
            {activeTab === 'menu' ? 'Configurações' : tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium line-clamp-1">
            {activeTab === 'menu' ? 'Gerencie as preferências de segurança, armazenamento e conta' : tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>
      </div>
    </header>
  );
}
