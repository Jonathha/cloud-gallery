import React, { useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { authPrimary } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export function usePasswordChangeLogic(
  user: any,
  showToast: (message: string, type?: "success" | "error" | "info") => void,
) {
  const { registerFailedAttempt, resetFailedAttempts, lockVault } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeUser = authPrimary.currentUser;
    if (!activeUser || !activeUser.email) {
      showToast("Sessão inválida ou expirada. Faça login novamente.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("As novas senhas não coincidem.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("A nova senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        activeUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(activeUser, credential);
      await updatePassword(activeUser, newPassword);
      await resetFailedAttempts();
      showToast("Senha alterada com sucesso.", "success");
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        const { lockedUntil } = await registerFailedAttempt();
        if (lockedUntil) {
          showToast(
            "Muitas tentativas falhas. Cofre bloqueado temporariamente.",
            "error",
          );
          setIsChangingPassword(false);
          await lockVault();
        } else {
          showToast("Senha atual incorreta.", "error");
        }
      } else if (error.code === "auth/too-many-requests") {
        showToast("Muitas tentativas. Tente novamente mais tarde.", "error");
      } else {
        console.error("Erro ao alterar senha:", error);
        showToast("Erro ao alterar a senha. Tente novamente.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    const activeUser = authPrimary.currentUser;
    if (!activeUser || !activeUser.email) {
      showToast("Sessão inválida ou expirada. Faça login novamente.", "error");
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendPasswordResetEmail(authPrimary, activeUser.email);
      showToast(
        "E-mail de redefinição de senha enviado com sucesso!",
        "success",
      );
    } catch (error: any) {
      console.error("Erro ao enviar e-mail de redefinição:", error);
      showToast(
        "Erro ao enviar o e-mail. Tente novamente mais tarde.",
        "error",
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return {
    isChangingPassword,
    setIsChangingPassword,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    isSendingEmail,
    handleChangePassword,
    handleSendResetEmail,
  };
}
