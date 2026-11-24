import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { isQuickAccessEnabled, disableQuickAccess, verifyAndEnableQuickAccess, isFakeVaultSession } from "../../../utils/quickAccess";

interface UseQuickAccessLogicProps {
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function useQuickAccessLogic({ showToast }: UseQuickAccessLogicProps) {
  const { user, setCryptoKey } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [pin, setPin] = useState(""); const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = isFakeVaultSession();

  useEffect(() => {
    if (user) setIsEnabled(isQuickAccessEnabled(user.uid));
  }, [user]);

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || loading || blocked) return;
    if (!pin || pin.trim().length === 0) {
      setError("Digite a sua senha atual do cofre.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await verifyAndEnableQuickAccess(pin, user, setCryptoKey);
      if (result.success) {
        setIsEnabled(true);
        setPin("");
        showToast("Acesso Rápido ativado com sucesso!", "success");
      } else {
        setError(result.error || "Senha incorreta.");
      }
    } catch (err: any) {
      setError("Erro ao processar ativação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      await disableQuickAccess(user.uid);
      setIsEnabled(false);
      showToast("Acesso Rápido desativado.", "info");
    } catch {
      showToast("Erro ao desativar Acesso Rápido.", "error");
    } finally {
      setLoading(false);
    }
  };

  return { blocked, isEnabled, pin, setPin, showPin, setShowPin, loading, error, setError, handleEnable, handleDisable };
}

export default useQuickAccessLogic;
