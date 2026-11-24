import { useEffect } from "react";

export function useAutoLock(cryptoKey: CryptoKey | null, lockVault: () => Promise<void> | void) {
  useEffect(() => {
    if (!cryptoKey) return;

    let timeoutId: NodeJS.Timeout;
    let cachedTimerSetting = localStorage.getItem("autoLockTimer") || "15";
    let lastStorageCheck = Date.now();

    const getTimerSetting = () => {
      const now = Date.now();
      // Read from localStorage at most once every 5 seconds to eliminate synchronous reads during high-frequency scroll
      if (now - lastStorageCheck > 5000) {
        cachedTimerSetting = localStorage.getItem("autoLockTimer") || "15";
        lastStorageCheck = now;
      }
      return cachedTimerSetting;
    };

    const resetTimer = () => {
      let timerSetting = getTimerSetting();
      if (timerSetting === '5') timerSetting = '1';

      if (timerSetting === "never") {
        clearTimeout(timeoutId);
        return;
      }

      const minutes = parseInt(timerSetting, 10);
      if (isNaN(minutes)) return;

      clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          lockVault();
        },
        minutes * 60 * 1000,
      );
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "autoLockTimer" && e.newValue) {
        cachedTimerSetting = e.newValue;
        lastStorageCheck = Date.now();
        resetTimer();
      }
    };

    const handleActivity = () => {
      resetTimer();
    };

    // Initial setup
    resetTimer();

    // Listeners
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("storage", handleStorage);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("storage", handleStorage);
    };
  }, [cryptoKey, lockVault]);
}
