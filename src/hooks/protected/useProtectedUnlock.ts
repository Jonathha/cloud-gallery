import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export function useProtectedUnlock() {
  const {
    user,
    extraPassword,
    lockVault,
    registerFailedAttempt,
    resetFailedAttempts,
  } = useAuth();

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlockingOverlay, setIsUnlockingOverlay] = useState(false);

  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setIsLoading(true);
    setPasswordError("");
    
    if (passwordInput.trim() === (extraPassword || "").trim()) {
      setIsUnlocked(true);
      setPasswordError("");
      setPasswordInput("");
      setIsLoading(false);
      
      if (user) await resetFailedAttempts();
    } else {
      setIsLoading(false);
      if (user) {
        const { lockedUntil } = await registerFailedAttempt();
        if (lockedUntil) {
          setPasswordError(
            "Muitas tentativas falhas. Cofre bloqueado temporariamente.",
          );
          lockVault();
        } else {
          setPasswordError("Senha incorreta. Tente novamente.");
        }
      } else {
        setPasswordError("Senha incorreta. Tente novamente.");
      }
    }
  };

  return {
    isUnlocked,
    setIsUnlocked,
    passwordInput,
    setPasswordInput,
    passwordError,
    setPasswordError,
    handleUnlockSubmit,
    isLoading,
  };
}
