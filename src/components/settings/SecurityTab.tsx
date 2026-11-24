import React, { useState, useEffect } from 'react';
import { isAndroidNativeContainer } from '../../utils/nativeNotifications';
import PrivacyModeCard from './security/PrivacyModeCard';
import AutoLockCard, { PRESET_OPTIONS } from './security/AutoLockCard';
import NativeNotificationCard from './security/NativeNotificationCard';
import BrowserNotificationCard from './security/BrowserNotificationCard';

interface SecurityTabProps {
  privacyMode: boolean;
  handleTogglePrivacy: () => void;
  autoLockTimer: string;
  handleSaveTimer: (val: string) => void;
}

export default function SecurityTab({
  privacyMode,
  handleTogglePrivacy,
  autoLockTimer,
  handleSaveTimer
}: SecurityTabProps) {
  const isNative = isAndroidNativeContainer();
  const [customMinutes, setCustomMinutes] = useState<string>('');

  useEffect(() => {
    const isStandardPreset = PRESET_OPTIONS.some((p) => p.value === autoLockTimer);
    if (!isStandardPreset && autoLockTimer && autoLockTimer !== 'never') {
      setCustomMinutes(autoLockTimer);
    } else {
      setCustomMinutes('');
    }
  }, [autoLockTimer]);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customMinutes, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 1440) {
      handleSaveTimer(String(parsed));
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PrivacyModeCard privacyMode={privacyMode} handleTogglePrivacy={handleTogglePrivacy} />
      <AutoLockCard
        autoLockTimer={autoLockTimer}
        handleSaveTimer={handleSaveTimer}
        customMinutes={customMinutes}
        setCustomMinutes={setCustomMinutes}
        handleCustomSubmit={handleCustomSubmit}
      />
      {isNative ? <NativeNotificationCard /> : <BrowserNotificationCard />}
    </div>
  );
}
