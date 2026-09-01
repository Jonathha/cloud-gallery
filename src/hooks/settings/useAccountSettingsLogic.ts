import React, { useState } from "react";

interface UseAccountSettingsLogicProps {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onClose?: () => void;
  extraPassword: string | null;
  cryptoKey: CryptoKey | null;
  lockVault: () => void;
  updateExtraPassword: (password: string) => Promise<void>;
  changeVaultPin: (currentPin: string, newPin: string) => Promise<void>;
  registerFailedAttempt: () => Promise<{ lockedUntil: number | string | null; failedAttempts?: number }>;
  resetFailedAttempts: () => Promise<void>;
}

export function useAccountSettingsLogic({
  showToast,
  onClose,
  extraPassword,
  cryptoKey,
  lockVault,
  updateExtraPassword,
  changeVaultPin,
  registerFailedAttempt,
  resetFailedAttempts,
}: UseAccountSettingsLogicProps) {
  const [isChangingExtraPassword, setIsChangingExtraPassword] = useState(false);
  const [currentExtraPassword, setCurrentExtraPassword] = useState("");
  const [newExtraPasswordState, setNewExtraPasswordState] = useState("");
  const [confirmNewExtraPassword, setConfirmNewExtraPassword] = useState("");
  const [isUpdatingExtraPassword, setIsUpdatingExtraPassword] = useState(false);

  const [isChangingVaultPin, setIsChangingVaultPin] = useState(false);
  const [currentVaultPin, setCurrentVaultPin] = useState("");
  const [newVaultPin, setNewVaultPin] = useState("");
  const [confirmNewVaultPin, setConfirmNewVaultPin] = useState("");
  const [isUpdatingVaultPin, setIsUpdatingVaultPin] = useState(false);

  const handleChangeVaultPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentVaultPin) {
      showToast("Por favor, digite a senha do cofre atual", "error");
      return;
    }

    if (!newVaultPin) {
      showToast("A nova senha do cofre não pode estar vazia", "error");
      return;
    }

    if (newVaultPin.length < 6 || newVaultPin.length > 30) {
      showToast("A nova senha deve ter entre 6 e 30 caracteres", "error");
      return;
    }

    if (newVaultPin !== confirmNewVaultPin) {
      showToast("As novas senhas não coincidem", "error");
      return;
    }

    setIsUpdatingVaultPin(true);
    try {
      await changeVaultPin(currentVaultPin, newVaultPin);
      await resetFailedAttempts();
      showToast(
        "Senha de desbloqueio do cofre alterada com sucesso!",
        "success",
      );

      setIsChangingVaultPin(false);
      setCurrentVaultPin("");
      setNewVaultPin("");
      setConfirmNewVaultPin("");

      setTimeout(async () => {
        if (onClose) {
          onClose();
        }
        await lockVault();
      }, 1500);
    } catch (error: any) {
      console.error("[AccountSettings] Erro ao alterar senha do cofre:", error);
      const { lockedUntil } = await registerFailedAttempt();
      if (lockedUntil) {
        showToast(
          "Muitas tentativas falhas. Cofre bloqueado temporariamente.",
          "error",
        );
        if (onClose) onClose();
        await lockVault();
      } else {
        showToast(error.message || "Senha atual incorreta.", "error");
      }
    } finally {
      setIsUpdatingVaultPin(false);
    }
  };

  const handleChangeExtraPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (extraPassword) {
      if (!currentExtraPassword) {
        showToast("Por favor, digite a senha das imagens atual", "error");
        return;
      }
      if (currentExtraPassword.trim() !== extraPassword.trim()) {
        const { lockedUntil } = await registerFailedAttempt();
        if (lockedUntil) {
          showToast(
            "Muitas tentativas falhas. Cofre bloqueado temporariamente.",
            "error",
          );
          if (onClose) onClose();
          await lockVault();
        } else {
          showToast("A senha das imagens atual está incorreta", "error");
        }
        return;
      }
    }

    if (!newExtraPasswordState) {
      showToast("A nova senha não pode estar vazia", "error");
      return;
    }

    if (newExtraPasswordState.length < 4) {
      showToast("A nova senha deve ter pelo menos 4 caracteres", "error");
      return;
    }

    if (newExtraPasswordState !== confirmNewExtraPassword) {
      showToast("As novas senhas não coincidem", "error");
      return;
    }

    setIsUpdatingExtraPassword(true);
    try {
      if (!cryptoKey) {
        showToast("Cofre não está desbloqueado", "error");
        return;
      }

      await updateExtraPassword(newExtraPasswordState);
      await resetFailedAttempts();

      showToast("Senha das imagens alterada com sucesso!", "success");

      setIsChangingExtraPassword(false);
      setCurrentExtraPassword("");
      setNewExtraPasswordState("");
      setConfirmNewExtraPassword("");
    } catch (error) {
      console.error("Erro ao atualizar senha das imagens:", error);
      showToast("Erro ao atualizar a senha das imagens", "error");
    } finally {
      setIsUpdatingExtraPassword(false);
    }
  };

  return {
    isChangingExtraPassword,
    setIsChangingExtraPassword,
    currentExtraPassword,
    setCurrentExtraPassword,
    newExtraPasswordState,
    setNewExtraPasswordState,
    confirmNewExtraPassword,
    setConfirmNewExtraPassword,
    isUpdatingExtraPassword,

    isChangingVaultPin,
    setIsChangingVaultPin,
    currentVaultPin,
    setCurrentVaultPin,
    newVaultPin,
    setNewVaultPin,
    confirmNewVaultPin,
    setConfirmNewVaultPin,
    isUpdatingVaultPin,

    handleChangeVaultPin,
    handleChangeExtraPassword,
  };
}
