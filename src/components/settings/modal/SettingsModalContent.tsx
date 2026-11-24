import React, { useLayoutEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { SettingsHeader } from '../SettingsHeader';
import { SettingsMenu } from '../SettingsMenu';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsTabContent } from './SettingsTabContent';
import { DecryptedImage, ICON_MAP } from './types';

interface SettingsModalContentProps {
  isInline?: boolean;
  isApp: boolean;
  s: any;
  images: DecryptedImage[];
  onOpenTrash?: () => void;
  onClose: () => void;
}

export const SettingsModalContent: React.FC<SettingsModalContentProps> = ({
  isInline, isApp, s, images, onOpenTrash, onClose
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // O contêiner de rolagem é único: sem isso, a nova aba abre na posição de rolagem da anterior.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [s.activeTab]);

  return (
    <div className={`flex flex-col bg-zinc-950 ${isInline ? 'h-full w-full' : 'relative w-full max-w-4xl md:rounded-3xl shadow-2xl overflow-hidden border-0 md:border border-white/10 h-[100dvh] md:h-[650px] md:max-h-[85vh]'}`}>
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">
        <SettingsSidebar tabs={s.tabs} activeTab={s.activeTab} setActiveTab={s.setActiveTab} />
        <div className="flex-1 flex flex-col min-w-0 bg-[#050505] overflow-hidden relative">
          <SettingsHeader isApp={isApp} activeTab={s.activeTab} tabs={s.tabs} setActiveTab={s.setActiveTab} />
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain touch-pan-y relative" style={{ WebkitOverflowScrolling: 'touch' }}>
            {s.activeTab === 'menu' ? (
              <div className="md:hidden">
                <SettingsMenu tabs={s.tabs} onOpenTrash={onOpenTrash} isInline={isInline} handleClose={s.handleClose} setActiveTab={s.setActiveTab} ICON_MAP={ICON_MAP} />
              </div>
            ) : (
              <motion.div
                key={s.activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="p-4 sm:p-6 pb-28 md:pb-8 min-h-full"
              >
                <div className="max-w-xl mx-auto">
                  <SettingsTabContent activeTab={s.activeTab} s={s} images={images} onClose={onClose} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
