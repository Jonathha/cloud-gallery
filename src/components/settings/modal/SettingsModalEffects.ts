import React, { useEffect, useState } from 'react';

/**
 * Hook para gerenciar animação única por sessão e classe no body para travar scroll
 */
export function useSettingsModalEffects(
  isOpen: boolean,
  activeTab: string,
  tabs: Array<{ id: string }>,
  setActiveTab: (tabId: any) => void
) {
  const [hasAnimated, setHasAnimated] = useState(() => {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('settings_animated_v2') === 'true';
  });

  useEffect(() => {
    if (isOpen && !hasAnimated) {
      sessionStorage.setItem('settings_animated_v2', 'true');
      setHasAnimated(true);
    }
  }, [isOpen, hasAnimated]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'menu' && typeof window !== 'undefined' && window.innerWidth >= 768) {
      if (tabs && tabs.length > 0) {
        setActiveTab(tabs[0].id as any);
      }
    }
  }, [activeTab, tabs, setActiveTab]);

  return { hasAnimated };
}
