import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { dbPrimary } from "../../firebase";
import { signVaultData } from "../../utils/integrity";

export function useVaultLockout(user: any) {
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    async function syncAttemptsFromServer() {
      const cachedData = localStorage.getItem(`vault_data_${user.uid}`);
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          if (data.failedAttempts) {
            setFailedAttempts(data.failedAttempts);
          }
          if (data.lockedUntil && data.lockedUntil > Date.now()) {
            setLockedUntil(data.lockedUntil);
          }
        } catch (e) {}
      }

      try {
        const userDocRef = doc(dbPrimary, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const serverData = userDoc.data();
          const serverFailedAttempts = serverData.failedAttempts || 0;
          const serverLockedUntil = serverData.lockedUntil || null;

          const cached = localStorage.getItem(`vault_data_${user.uid}`);
          let localAttempts = 0;
          let localLockout: number | null = null;
          let data: any = null;

          if (cached) {
            try {
              data = JSON.parse(cached);
              localAttempts = data.failedAttempts || 0;
              localLockout = data.lockedUntil || null;
            } catch (err) {}
          }

          const mergedLockout = (localLockout && localLockout > Date.now())
            ? localLockout
            : (serverLockedUntil && serverLockedUntil > Date.now() ? serverLockedUntil : null);

          const mergedAttempts = Math.max(localAttempts, serverFailedAttempts);

          setFailedAttempts(mergedAttempts);
          setLockedUntil(mergedLockout);

          if (data) {
            data.failedAttempts = mergedAttempts;
            data.lockedUntil = mergedLockout;
            try {
              const sig = await signVaultData(user.uid, mergedAttempts, mergedLockout);
              data.integritySignature = sig;
            } catch (e) {}
            localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn("Falha de rede ao conectar com o servidor. Usando modo de segurança local.", err);
      }
    }

    syncAttemptsFromServer();
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (lockedUntil) {
      const updateTimer = () => {
        const now = Date.now();
        if (now >= lockedUntil) {
          setLockedUntil(null);
          setRemainingTime("");

          if (user?.uid) {
            try {
              const cached = localStorage.getItem(`vault_data_${user.uid}`);
              if (cached) {
                const data = JSON.parse(cached);
                data.lockedUntil = null;
                signVaultData(user.uid, data.failedAttempts || 0, null).then((sig) => {
                  data.integritySignature = sig;
                  localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
                }).catch(() => {
                  localStorage.setItem(`vault_data_${user.uid}`, JSON.stringify(data));
                });
              }
            } catch (e) {}
          }
        } else {
          const diff = lockedUntil - now;
          const seconds = Math.floor((diff / 1000) % 60);
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
          const days = Math.floor(diff / 1000 / 60 / 60 / 24);

          if (days > 0) {
            setRemainingTime(`${days}d ${hours}h ${minutes}m`);
          } else if (hours > 0) {
            setRemainingTime(`${hours}h ${minutes}m ${seconds}s`);
          } else if (minutes > 0) {
            setRemainingTime(`${minutes}m ${seconds}s`);
          } else {
            setRemainingTime(`${seconds}s`);
          }
        }
      };

      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [lockedUntil]);

  return {
    failedAttempts,
    setFailedAttempts,
    lockedUntil,
    setLockedUntil,
    remainingTime,
    setRemainingTime
  };
}
