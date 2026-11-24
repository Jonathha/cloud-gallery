import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useVaultCaptcha } from "./vaultUnlock/useVaultCaptcha";
import { useVaultLockout } from "./vaultUnlock/useVaultLockout";
import { isQuickAccessEnabled, isManuallyLocked } from "../utils/quickAccess";

export function useVaultUnlockState() {
  const { unlockVault, unlockWithQuickAccess, logOut, user } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasTriedAutoUnlock, setHasTriedAutoUnlock] = useState(false);

  const isQuickAccess = Boolean(user && isQuickAccessEnabled(user.uid));

  const {
    showCaptcha,
    setShowCaptcha,
    captchaVerified,
    setCaptchaVerified,
    recaptchaToken,
    setRecaptchaToken,
    verifyCaptchaOnBackend
  } = useVaultCaptcha();

  const {
    failedAttempts,
    setFailedAttempts,
    lockedUntil,
    setLockedUntil,
    remainingTime,
    setRemainingTime
  } = useVaultLockout(user);

  // Tentativa de desbloqueio instantâneo se Acesso Rápido estiver ativo e não tiver sido travado manualmente
  useEffect(() => {
    if (user && isQuickAccess && !isManuallyLocked(user.uid) && !lockedUntil && !hasTriedAutoUnlock) {
      setHasTriedAutoUnlock(true);
      setLoading(true);
      unlockWithQuickAccess()
        .then((res) => {
          setLoading(false);
          if (res.success) {
            setFailedAttempts(0);
          }
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [user, isQuickAccess, lockedUntil, hasTriedAutoUnlock, unlockWithQuickAccess, setFailedAttempts]);

  const handleQuickUnlock = async () => {
    if (lockedUntil || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await unlockWithQuickAccess();
      if (res.success) {
        setFailedAttempts(0);
      } else {
        setError("Não foi possível acessar rapidamente. Digite a sua senha.");
      }
    } catch {
      setError("Erro no acesso rápido. Digite sua senha.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleTriggerCaptcha = () => {
      setCaptchaVerified(false);
      setRecaptchaToken(null);
      setShowCaptcha(true);
      setError("Verificação de segurança obrigatória para acessar as mídias do cofre.");
    };

    window.addEventListener("trigger-recaptcha-verification", handleTriggerCaptcha);
    return () => {
      window.removeEventListener("trigger-recaptcha-verification", handleTriggerCaptcha);
    };
  }, [setCaptchaVerified, setRecaptchaToken, setShowCaptcha]);

  useEffect(() => {
    if (!lockedUntil) {
      if (error === "Muitas tentativas falhas. Cofre bloqueado.") {
        setError("");
      }
      setShowCaptcha(false);
    }
  }, [lockedUntil, error, setShowCaptcha]);

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    if (lockedUntil) return;

    if (!pin || pin.trim() === "") {
      setError("Por favor, digite sua senha de acesso.");
      return;
    }

    if (pin.length < 6 || pin.length > 30) {
      setError("A senha deve ter entre 6 e 30 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await unlockVault(pin);
      if (!result.success) {
        setLoading(false);
        setCaptchaVerified(false);
        setRecaptchaToken(null);
        
        if (result.failedAttempts) {
          setFailedAttempts(result.failedAttempts);
        } else {
          setFailedAttempts(prev => prev + 1);
        }

        if (result.lockedUntil && result.lockedUntil > Date.now()) {
          setLockedUntil(result.lockedUntil);
          setError(`Muitas tentativas falhas. Cofre bloqueado.`);
          setPin("");
        } else {
          setError("Falha ao desbloquear o cofre. Verifique sua senha.");
          setPin("");
        }
      } else {
        setLoading(false);
        setFailedAttempts(0);
        setCaptchaVerified(false);
        setRecaptchaToken(null);
      }
    } catch (err) {
      setLoading(false);
      setCaptchaVerified(false);
      setError("Ocorreu um erro ao tentar desbloquear o cofre. Verifique se está offline ou tente de novo.");
    }
  };

  return {
    pin,
    setPin,
    error,
    setError,
    loading,
    setLoading,
    showPassword,
    setShowPassword,
    lockedUntil,
    setLockedUntil,
    remainingTime,
    setRemainingTime,
    failedAttempts,
    setFailedAttempts,
    handleSubmit,
    logOut,
    user,
    isQuickAccess,
    handleQuickUnlock,
    showCaptcha,
    setShowCaptcha,
    captchaVerified,
    setCaptchaVerified,
    recaptchaToken,
    setRecaptchaToken,
    verifyCaptchaOnBackend: (token: string) => verifyCaptchaOnBackend(token, setError)
  };
}
