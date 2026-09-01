import { useEffect } from "react";

export function useAutoLock(cryptoKey: CryptoKey | null, lockVault: () => Promise<void> | void) {
  useEffect(() => {
    if (!cryptoKey) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      let timerSetting = localStorage.getItem("autoLockTimer") || "15";
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

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [cryptoKey, lockVault]);
}
