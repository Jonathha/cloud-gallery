import { User } from "firebase/auth";

export enum AuthStatus {
  Loading = 0,
  Unauthenticated = 1,
  NeedsSetup = 2,
  Locked = 3,
  Unlocked = 4,
}

export interface UnlockResult {
  success: boolean;
  lockedUntil?: number | null;
  failedAttempts?: number;
}

export interface AuthContextType {
  user: User | null;
  cryptoKey: CryptoKey | null;
  isAuthReady: boolean;
  needsSetup: boolean;
  authStatus: AuthStatus;
  extraPassword: string | null;
  encryptionMode: 'standard' | 'custom_extra';
  securityImageId: string | null;
  updateExtraPassword: (password: string) => Promise<void>;
  switchEncryptionMode: (mode: 'standard' | 'custom_extra', extraPassword?: string | null) => Promise<void>;
  setSecurityImage: (imageId: string | null, customExtraPassword?: string) => Promise<void>;
  signIn: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
  setupVault: (pin: string, extraPassword?: string | null, mode?: 'standard' | 'custom_extra') => Promise<void>;
  unlockVault: (pin: string) => Promise<UnlockResult>;
  lockVault: () => Promise<void>;
  registerFailedAttempt: () => Promise<{ lockedUntil: number | null, failedAttempts: number }>;
  resetFailedAttempts: () => Promise<void>;
  changeVaultPin: (currentPin: string, newPin: string) => Promise<void>;
  showProtected: boolean;
  setShowProtected: (val: boolean) => void;
}

export const getPlainExtraPassword = (extraVal: any): string | null => {
  if (typeof extraVal === "string") return extraVal;
  return null;
};
