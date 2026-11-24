import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { isNativeApp } from '../utils/isNativeApp';
import Toast from './Toast';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import { SettingsModalProps } from './settings/modal/types';
import { useSettingsModalEffects } from './settings/modal/SettingsModalEffects';
import { SettingsModalContent } from './settings/modal/SettingsModalContent';

export default function SettingsModal({
  isOpen, onClose, images = [], onOpenTrash, isInline, initialTab, onSubTabChange
}: SettingsModalProps) {
  const isApp = isNativeApp();
  const s = useSettingsLogic(isOpen, images, onClose, onOpenTrash, initialTab, onSubTabChange);
  const { hasAnimated } = useSettingsModalEffects(isOpen, s.activeTab, s.tabs, s.setActiveTab);

  const content = (
    <SettingsModalContent
      isInline={isInline}
      isApp={isApp}
      s={s}
      images={images}
      onOpenTrash={onOpenTrash}
      onClose={onClose}
    />
  );

  if (isInline) {
    return (
      <motion.div
        initial={hasAnimated ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="h-full w-full"
      >
        {content}
        {s.toast && <Toast key="settings-toast" message={s.toast.message} type={s.toast.type} onClose={() => s.setToast(null)} />}
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="settings-modal" initial={hasAnimated ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6">
          <div onClick={() => s.handleClose()} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={hasAnimated ? false : { scale: 0.98, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 15 }} transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }} className="flex flex-col h-full w-full max-w-4xl relative z-10">
            {content}
          </motion.div>
        </motion.div>
      )}
      {s.toast && <Toast key="settings-toast" message={s.toast.message} type={s.toast.type} onClose={() => s.setToast(null)} />}
    </AnimatePresence>
  );
}
