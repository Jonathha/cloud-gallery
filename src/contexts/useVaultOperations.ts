import { User } from "firebase/auth";
import { setupVaultLogic, unlockVaultLogic, lockVaultLogic, registerFailedAttemptLogic, resetFailedAttemptsLogic } from "./vault/vaultCore";
import { updateExtraPasswordLogic, setSecurityImageLogic, switchEncryptionModeLogic } from "./vault/vaultSettings";
import { changeVaultPinLogic } from "./vault/vaultMaintenance";

interface UseVaultOperationsProps {
  user: User | null;
  cryptoKey: CryptoKey | null;
  setCryptoKey: (key: CryptoKey | null) => void;
  setNeedsSetup: (needs: boolean) => void;
  extraPassword: string | null;
  setExtraPassword: (pwd: string | null) => void;
  setSecurityImageId: (id: string | null) => void;
  securityImageId: string | null;
  setEncryptionModeState?: (mode: 'standard' | 'custom_extra') => void;
}

export function useVaultOperations({
  user,
  cryptoKey,
  setCryptoKey,
  setNeedsSetup,
  extraPassword,
  setExtraPassword,
  setSecurityImageId,
  securityImageId,
  setEncryptionModeState,
}: UseVaultOperationsProps) {
  
  const setupVault = (pin: string, extraPasswordInput?: string | null, mode?: 'standard' | 'custom_extra') => 
    setupVaultLogic(pin, user!, setCryptoKey, setNeedsSetup, extraPasswordInput, mode);

  const unlockVault = (pin: string) => unlockVaultLogic(pin, user!, setCryptoKey);
  const lockVault = () => lockVaultLogic(user, setCryptoKey);
  const updateExtraPassword = (password: string) => updateExtraPasswordLogic(password, user!, cryptoKey!, setExtraPassword);
  
  const switchEncryptionMode = (mode: 'standard' | 'custom_extra', newExtraPasswordInput?: string | null) =>
    switchEncryptionModeLogic(mode, newExtraPasswordInput || null, user!, cryptoKey!, setExtraPassword, setEncryptionModeState);

  const setSecurityImage = (imageId: string | null, customExtraPassword?: string) => 
    setSecurityImageLogic(imageId, user!, cryptoKey!, extraPassword, securityImageId, setSecurityImageId, customExtraPassword);

  const changeVaultPin = (currentPin: string, newPin: string) => 
    changeVaultPinLogic(currentPin, newPin, user!, cryptoKey!, extraPassword, setCryptoKey);
    
  const registerFailedAttempt = () => registerFailedAttemptLogic(user!);
  const resetFailedAttempts = () => resetFailedAttemptsLogic(user!);

  return {
    setupVault,
    unlockVault,
    lockVault,
    updateExtraPassword,
    switchEncryptionMode,
    setSecurityImage,
    changeVaultPin,
    registerFailedAttempt,
    resetFailedAttempts,
  };
}


