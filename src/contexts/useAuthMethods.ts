import { useState } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import { authPrimary } from "../firebase";
import { removeKeyFromLocal } from "../utils/db";

import { recordAuditEvent } from "../services/adminAuditService";

export function useAuthMethods(user: User | null, setCryptoKey: (key: CryptoKey | null) => void) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const signIn = async () => {
    let retries = 0;
    const attemptSignIn = async (): Promise<void> => {
      try {
        await signInWithPopup(authPrimary, new GoogleAuthProvider());
      } catch (error: any) {
        if (error.code === "auth/network-request-failed" && retries < 2) {
          retries++;
          await new Promise(r => setTimeout(r, 1500));
          return attemptSignIn();
        }
        if (error.code === "auth/network-request-failed") {
          throw new Error("Falha na conexão com o servidor de autenticação. Verifique sua internet ou se há algum bloqueador de anúncios impedindo o acesso.");
        }
        console.error("Erro ao autenticar no projeto primário:", error);
        throw error;
      }
    };
    return attemptSignIn();
  };

  const signInEmail = async (e: string, p: string) => { await signInWithEmailAndPassword(authPrimary, e, p); };
  const signUpEmail = async (e: string, p: string) => { await createUserWithEmailAndPassword(authPrimary, e, p); };
  const resetPassword = async (e: string) => { await sendPasswordResetEmail(authPrimary, e); };

  const performActualLogOut = async () => {
    setIsLogoutConfirmOpen(false);
    if (user) {
      recordAuditEvent({
        type: 'logout',
        userId: user.uid,
        userEmail: user.email || '',
        details: 'Logout de usuário realizado'
      });
      await removeKeyFromLocal(user.uid);
    }
    sessionStorage.removeItem('is_fake_vault_active');
    await signOut(authPrimary);
    setCryptoKey(null);
  };

  const logOut = async () => {
    setIsLogoutConfirmOpen(true);
  };

  return {
    signIn,
    signInEmail,
    signUpEmail,
    resetPassword,
    logOut,
    isLogoutConfirmOpen,
    setIsLogoutConfirmOpen,
    performActualLogOut
  };
}
