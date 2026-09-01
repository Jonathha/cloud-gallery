import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { decryptData } from "../utils/crypto";
import { AuthContextType, AuthStatus } from "./AuthContextTypes";
import { useAutoLock } from "./useAutoLock";
import { useVaultOperations } from "./useVaultOperations";
import { useExtraPasswordSync } from "./useExtraPasswordSync";
import { useAuthInitialize } from "../hooks/useAuthInitialize";
import ConfirmModal from "../components/ConfirmModal";
import { startNativeBackgroundChatListener, stopNativeBackgroundChatListener } from "../utils/appBridge";
import { useAndroidAuthBridge } from "./useAndroidAuthBridge";
import { useAuthMethods } from "./useAuthMethods";
import { clearSessionDecryptedCache } from "../hooks/gallery/galleryDecryptHelper";
import { clearDerivedKeyCache, clearVideoObjectURLs, clearImageObjectURLs } from "../utils/fileCrypto";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
    if (user) {
      startNativeBackgroundChatListener(user.uid);
      const pendingToken = localStorage.getItem("pending_fcm_token");
      if (pendingToken && (window as any).receiveFcmTokenFromAndroid) {
        (window as any).receiveFcmTokenFromAndroid(pendingToken).catch(console.error);
        localStorage.removeItem("pending_fcm_token");
      }
    } else {
      stopNativeBackgroundChatListener();
    }
  }, [user]);

  const [extraPassword, setExtraPassword] = useState<string | null>(null);
  const [encryptionModeState, setEncryptionModeState] = useState<'standard' | 'custom_extra'>('standard');
  const [securityImageId, setSecurityImageId] = useState<string | null>(null);
  const [showProtected, setShowProtected] = useState(false);

  const encryptionMode: 'standard' | 'custom_extra' = useMemo(() => {
    if (extraPassword) return 'custom_extra';
    return encryptionModeState;
  }, [extraPassword, encryptionModeState]);

  const authStatus = useMemo(() => {
    if (!isAuthReady) return AuthStatus.Loading;
    if (!user) return AuthStatus.Unauthenticated;
    if (needsSetup) return AuthStatus.NeedsSetup;
    if (!cryptoKey) return AuthStatus.Locked;
    return AuthStatus.Unlocked;
  }, [isAuthReady, user, needsSetup, cryptoKey]);

  const setOrDecryptExtraPassword = async (extraVal: any, key: CryptoKey | null) => {
    if (extraVal && typeof extraVal === "object" && extraVal.ciphertext && extraVal.iv) {
      if (key) {
        try {
          const decrypted = await decryptData(extraVal.ciphertext, extraVal.iv, key);
          setExtraPassword(decrypted);
          setEncryptionModeState('custom_extra');
        } catch (err) {
          setExtraPassword(null);
        }
      } else {
        setExtraPassword(null);
      }
    } else if (typeof extraVal === "string" && extraVal) {
      setExtraPassword(extraVal);
      setEncryptionModeState('custom_extra');
    } else {
      setExtraPassword(null);
    }
  };

  const {
    setupVault,
    unlockVault: baseUnlockVault,
    lockVault: baseLockVault,
    updateExtraPassword,
    switchEncryptionMode,
    setSecurityImage,
    changeVaultPin,
    registerFailedAttempt,
    resetFailedAttempts,
  } = useVaultOperations({
    user,
    cryptoKey,
    setCryptoKey,
    setNeedsSetup,
    extraPassword,
    setExtraPassword,
    setSecurityImageId,
    securityImageId,
    setEncryptionModeState,
  });

  const unlockVault = async (pin: string) => {
    // 1. Sempre tenta abrir o cofre original primeiro
    const realResult = await baseUnlockVault(pin);
    if (realResult.success) {
      sessionStorage.removeItem('is_fake_vault_active');
      return realResult;
    }

    // 2. Se a senha não for do cofre real, verifica se é o PIN do cofre falso (decoy)
    const fakePin = localStorage.getItem('fake_vault_pin');
    if (fakePin && pin === fakePin) {
      sessionStorage.setItem('is_fake_vault_active', 'true');
      if (user) {
        try {
          await resetFailedAttempts();
        } catch (e) {
          console.warn("[Auth] Erro ao resetar tentativas no cofre falso:", e);
        }
      }
      const dummyKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      setCryptoKey(dummyKey);
      return { success: true };
    }

    // 3. Nem o cofre real nem o falso foram validados
    sessionStorage.removeItem('is_fake_vault_active');
    return realResult;
  };

  const lockVault = async () => {
    sessionStorage.removeItem('is_fake_vault_active');
    return baseLockVault();
  };

  useAutoLock(cryptoKey, lockVault);

  // Clear all cryptographic session caches when the vault is locked/logged out
  useEffect(() => {
    if (!cryptoKey) {
      clearSessionDecryptedCache();
      clearDerivedKeyCache();
      clearVideoObjectURLs();
      clearImageObjectURLs();
      console.log("[Auth] Cryptographic session caches cleared.");
    }
  }, [cryptoKey]);

  useAuthInitialize({
    setUser,
    setNeedsSetup,
    setOrDecryptExtraPassword,
    setSecurityImageId,
    setIsAuthReady,
    cryptoKey,
    setCryptoKey,
    setExtraPassword,
    isAuthReady,
  });

  useAndroidAuthBridge(userRef);

  const {
    signIn,
    signInEmail,
    signUpEmail,
    resetPassword,
    logOut,
    isLogoutConfirmOpen,
    setIsLogoutConfirmOpen,
    performActualLogOut
  } = useAuthMethods(user, setCryptoKey);

  useExtraPasswordSync(user, cryptoKey, setOrDecryptExtraPassword, setSecurityImageId);

  return (
    <AuthContext.Provider
      value={{
        user,
        cryptoKey,
        isAuthReady,
        needsSetup,
        authStatus,
        signIn,
        signInEmail,
        signUpEmail,
        resetPassword,
        logOut,
        setupVault,
        unlockVault,
        lockVault,
        extraPassword,
        encryptionMode,
        securityImageId,
        updateExtraPassword,
        switchEncryptionMode,
        setSecurityImage,
        changeVaultPin,
        showProtected,
        setShowProtected,
        registerFailedAttempt,
        resetFailedAttempts,
      }}
    >
      {children}
      <ConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={performActualLogOut}
        title="Sair?"
        message="Você terá que iniciar sessão de novo para continuar usando o Cloud Gallery"
        confirmText="Sair"
        cancelText="Cancelar"
        isDestructive={true}
      />
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
