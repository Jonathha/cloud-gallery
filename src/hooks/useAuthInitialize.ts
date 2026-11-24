import { useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { authPrimary } from "../firebase";
import { checkForMigration } from "../utils/authMigration";
import { recordUserAccess } from "../services/adminAuditService";
import { signVaultData } from "../utils/integrity";
import { isQuickAccessEnabled, getQuickAccessKey, isManuallyLocked } from "../utils/quickAccess";
import { fetchVaultConfigApi } from "../services/vaultApiService";

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
    let savedOfflineUser: string | null = null;
    try {
      savedOfflineUser = localStorage.getItem("offline_user");
    } catch (e) {}
    let initialUser: any = null;

    if (savedOfflineUser) {
      try {
        initialUser = JSON.parse(savedOfflineUser);
        setUser(initialUser);

        let cachedVaultData: string | null = null;
        try {
          cachedVaultData = localStorage.getItem(
            `vault_data_${initialUser.uid}`,
          );
        } catch (e) {}
        if (cachedVaultData) {
          const data = JSON.parse(cachedVaultData);
          setNeedsSetup(false);
          if (isQuickAccessEnabled(initialUser.uid) && !isManuallyLocked(initialUser.uid)) {
            getQuickAccessKey(initialUser.uid).then(async (quickKey) => {
              if (quickKey) {
                setCryptoKey(quickKey);
                await setOrDecryptExtraPassword(data.extraPassword, quickKey);
              } else {
                await setOrDecryptExtraPassword(data.extraPassword, null);
              }
            }).catch(() => {
              setOrDecryptExtraPassword(data.extraPassword, null);
            });
          } else {
            setOrDecryptExtraPassword(data.extraPassword, null);
          }
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
            if (isQuickAccessEnabled(currentUser.uid) && !isManuallyLocked(currentUser.uid)) {
              try {
                const quickKey = await getQuickAccessKey(currentUser.uid);
                if (quickKey) {
                  setCryptoKey(quickKey);
                  await setOrDecryptExtraPassword(data.extraPassword, quickKey);
                } else {
                  await setOrDecryptExtraPassword(data.extraPassword, null);
                }
              } catch {
                await setOrDecryptExtraPassword(data.extraPassword, null);
              }
            } else {
              await setOrDecryptExtraPassword(data.extraPassword, null);
            }
            setSecurityImageId(data.securityImageId || null);

            // Sincronização em segundo plano com D1 para atestar estado autoritativo de lockout
            if (navigator.onLine) {
              fetchVaultConfigApi(currentUser)
                .then(async (remoteData) => {
                  if (remoteData && remoteData.salt) {
                    const rLockedUntil = remoteData.lockedUntil || null;
                    const rFailedAttempts = remoteData.failedAttempts || 0;
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
                .catch((e) => console.warn("[AUTH_INIT_SYNC] Offline or error syncing lockout from D1:", e));
            }

            setIsAuthReady(true);
          } else {
            setIsAuthReady(false);
            try {
              const remoteData = await fetchVaultConfigApi(currentUser);

              const hasRemoteVault = Boolean(
                remoteData && (
                  remoteData.vaultVersion === 2 ||
                  remoteData.vaultVersion === 1 ||
                  remoteData.opaqueRecord ||
                  remoteData.encryptedVaultKey ||
                  remoteData.verification ||
                  remoteData.salt ||
                  remoteData.hasMedia ||
                  remoteData.needsPasswordRestore
                )
              );

              if (hasRemoteVault) {
                setNeedsSetup(false);
                let restoredKey: CryptoKey | null = cryptoKey;
                if (!restoredKey && isQuickAccessEnabled(currentUser.uid) && !isManuallyLocked(currentUser.uid)) {
                  try {
                    restoredKey = await getQuickAccessKey(currentUser.uid);
                    if (restoredKey) {
                      setCryptoKey(restoredKey);
                    }
                  } catch {}
                }
                await setOrDecryptExtraPassword(remoteData.extraPassword, restoredKey);
                setSecurityImageId(remoteData.securityImageId || null);
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

                const finalFailedAttempts = Math.max(existingFailedAttempts, remoteData.failedAttempts || 0);
                const finalLockedUntil = (existingLockedUntil && existingLockedUntil > Date.now()) 
                  ? existingLockedUntil 
                  : (remoteData.lockedUntil || null);

                const finalSignature = await signVaultData(currentUser.uid, finalFailedAttempts, finalLockedUntil);

                localStorage.setItem(
                  `vault_data_${currentUser.uid}`,
                  JSON.stringify({
                    vaultVersion: remoteData.vaultVersion || 1,
                    salt: remoteData.salt || null,
                    verification: remoteData.verification || null,
                    encryptedVaultKey: remoteData.encryptedVaultKey || null,
                    keyWrappingVersion: remoteData.keyWrappingVersion || null,
                    encryptionMode: remoteData.encryptionMode || (remoteData.extraPassword ? 'custom_extra' : 'standard'),
                    extraPassword: remoteData.extraPassword,
                    securityImageId: remoteData.securityImageId,
                    extraPasswordUpdatedAt: remoteData.extraPasswordUpdatedAt || 0,
                    securityImageIdUpdatedAt: remoteData.securityImageIdUpdatedAt || 0,
                    failedAttempts: finalFailedAttempts,
                    lockedUntil: finalLockedUntil,
                    integritySignature: finalSignature,
                  }),
                );
              } else {
                setNeedsSetup(true);
              }
            } catch (error: any) {
              console.warn("Offline or error fetching user vault config:", error);
              setNeedsSetup(false);
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
