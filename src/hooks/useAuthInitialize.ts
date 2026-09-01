import { useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { authPrimary, dbPrimary } from "../firebase";
import { checkForMigration } from "../utils/authMigration";
import { recordUserAccess } from "../services/adminAuditService";
import { signVaultData } from "../utils/integrity";

interface AuthInitializeProps {
  setUser: (user: User | null) => void;
  setNeedsSetup: (needsSetup: boolean) => void;
  setOrDecryptExtraPassword: (extraVal: any, key: CryptoKey | null) => Promise<void>;
  setSecurityImageId: (id: string | null) => void;
  setIsAuthReady: (ready: boolean) => void;
  cryptoKey: CryptoKey | null;
  setCryptoKey: (key: CryptoKey | null) => void;
  setExtraPassword: (pwd: string | null) => void;
  isAuthReady: boolean;
}

export function useAuthInitialize({
  setUser,
  setNeedsSetup,
  setOrDecryptExtraPassword,
  setSecurityImageId,
  setIsAuthReady,
  cryptoKey,
  setCryptoKey,
  setExtraPassword,
  isAuthReady,
}: AuthInitializeProps) {
  useEffect(() => {
    const savedOfflineUser = localStorage.getItem("offline_user");
    let initialUser: any = null;

    if (savedOfflineUser) {
      try {
        initialUser = JSON.parse(savedOfflineUser);
        setUser(initialUser);

        const cachedVaultData = localStorage.getItem(
          `vault_data_${initialUser.uid}`,
        );
        if (cachedVaultData) {
          const data = JSON.parse(cachedVaultData);
          setNeedsSetup(false);
          setOrDecryptExtraPassword(data.extraPassword, null);
          setSecurityImageId(data.securityImageId || null);
          setIsAuthReady(true);
        }
      } catch (e) {
        console.error("Failed to parse offline user", e);
      }
    }

    let initialAuthFired = false;

    const unsubscribePrimary = onAuthStateChanged(
      authPrimary,
      async (currentUser) => {
        initialAuthFired = true;
        if (currentUser) {
          await checkForMigration(currentUser);

          const offlineUserInfo = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          };
          localStorage.setItem("offline_user", JSON.stringify(offlineUserInfo));
          setUser(currentUser);
          recordUserAccess(currentUser);

          const cachedData = localStorage.getItem(
            `vault_data_${currentUser.uid}`,
          );

          if (cachedData) {
            const data = JSON.parse(cachedData);
            setNeedsSetup(false);
            await setOrDecryptExtraPassword(data.extraPassword, null);
            setSecurityImageId(data.securityImageId || null);

            // Sincronização em segundo plano com Firestore para atestar estado autoritativo de lockout
            if (navigator.onLine) {
              getDoc(doc(dbPrimary, "users", currentUser.uid))
                .then(async (userDoc) => {
                  if (userDoc && userDoc.exists()) {
                    const rData = userDoc.data();
                    const rLockedUntil = rData.lockedUntil || null;
                    const rFailedAttempts = rData.failedAttempts || 0;
                    const now = Date.now();
                    const isRemoteLocked = rLockedUntil && now < rLockedUntil;

                    if (isRemoteLocked || rFailedAttempts > (data.failedAttempts || 0) || (rLockedUntil && rLockedUntil > (data.lockedUntil || 0))) {
                      data.failedAttempts = Math.max(data.failedAttempts || 0, rFailedAttempts);
                      data.lockedUntil = isRemoteLocked ? rLockedUntil : (rLockedUntil && rLockedUntil > (data.lockedUntil || 0) ? rLockedUntil : data.lockedUntil);
                      data.integritySignature = await signVaultData(currentUser.uid, data.failedAttempts, data.lockedUntil);
                      localStorage.setItem(`vault_data_${currentUser.uid}`, JSON.stringify(data));
                    }
                  }
                })
                .catch((e) => console.warn("[AUTH_INIT_SYNC] Offline or error syncing lockout:", e));
            }

            setIsAuthReady(true);
          } else {
            setIsAuthReady(false);
            try {
              const userDoc = await getDoc(doc(dbPrimary, "users", currentUser.uid));

              if (userDoc && userDoc.exists()) {
                setNeedsSetup(false);
                const data = userDoc.data();
                await setOrDecryptExtraPassword(data.extraPassword, cryptoKey);
                setSecurityImageId(data.securityImageId || null);
                let existingFailedAttempts = 0;
                let existingLockedUntil: number | null = null;
                const localItem = localStorage.getItem(`vault_data_${currentUser.uid}`);
                if (localItem) {
                  try {
                    const parsedLocal = JSON.parse(localItem);
                    existingFailedAttempts = parsedLocal.failedAttempts || 0;
                    existingLockedUntil = parsedLocal.lockedUntil || null;
                  } catch (e) {}
                }

                const finalFailedAttempts = Math.max(existingFailedAttempts, data.failedAttempts || 0);
                const finalLockedUntil = (existingLockedUntil && existingLockedUntil > Date.now()) 
                  ? existingLockedUntil 
                  : (data.lockedUntil || null);

                const finalSignature = await signVaultData(currentUser.uid, finalFailedAttempts, finalLockedUntil);

                localStorage.setItem(
                  `vault_data_${currentUser.uid}`,
                  JSON.stringify({
                    salt: data.salt,
                    verification: data.verification,
                    encryptedVaultKey: data.encryptedVaultKey || null,
                    keyWrappingVersion: data.keyWrappingVersion || null,
                    encryptionMode: data.encryptionMode || (data.extraPassword ? 'custom_extra' : 'standard'),
                    extraPassword: data.extraPassword,
                    securityImageId: data.securityImageId,
                    extraPasswordUpdatedAt: data.extraPasswordUpdatedAt || 0,
                    securityImageIdUpdatedAt: data.securityImageIdUpdatedAt || 0,
                    failedAttempts: finalFailedAttempts,
                    lockedUntil: finalLockedUntil,
                    integritySignature: finalSignature,
                  }),
                );
              } else {
                setNeedsSetup(true);
              }
            } catch (error: any) {
              console.warn(
                "Offline or error fetching user doc:",
                error,
              );
              if (error.code === 'permission-denied' || error.code === 'not-found') {
                setNeedsSetup(true);
              } else {
                setNeedsSetup(false);
              }
            }
            setIsAuthReady(true);
          }
        } else {
          setUser(null);
          localStorage.removeItem("offline_user");
          setCryptoKey(null);
          setNeedsSetup(false);
          setExtraPassword(null);
          setSecurityImageId(null);
          setIsAuthReady(true);
        }
      },
    );

    const timeout = setTimeout(
      () => {
        if (!initialAuthFired && !isAuthReady) {
          setIsAuthReady(true);
        }
      },
      savedOfflineUser ? 5000 : 1500,
    );

    return () => {
      unsubscribePrimary();
      clearTimeout(timeout);
    };
  }, []);
}
