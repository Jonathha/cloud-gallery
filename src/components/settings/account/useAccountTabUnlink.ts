import React from "react";
import { EmailAuthProvider, reauthenticateWithCredential, unlink } from "firebase/auth";
import { authPrimary } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";

interface UseAccountTabUnlinkProps {
  activeUser: any;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  onRefreshUser?: () => Promise<void>;
}

export function useAccountTabUnlink({ activeUser, showToast, onRefreshUser }: UseAccountTabUnlinkProps) {
  const { registerFailedAttempt, lockVault } = useAuth();
  const [unlinkPassword, setUnlinkPassword] = React.useState("");
  const [isLinkedManual, setIsLinkedManual] = React.useState<boolean | null>(null);
  const [isUnlinking, setIsUnlinking] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  const hasGoogle = React.useMemo(() => {
    return activeUser?.providerData?.some((p: any) => p.providerId === "google.com") ?? false;
  }, [activeUser]);

  const hasPasswordInProvider = React.useMemo(() => {
    return activeUser?.providerData?.some((p: any) => p.providerId === "password") ?? false;
  }, [activeUser]);

  const isEmailProvider = React.useMemo(() => {
    if (isLinkedManual === true) return true;
    if (isLinkedManual === false) return false;
    return hasPasswordInProvider || (!hasGoogle && Boolean(activeUser?.email));
  }, [isLinkedManual, hasPasswordInProvider, hasGoogle, activeUser?.email]);

  const canUnlink = React.useMemo(() => {
    // Only allow unlinking password if there is another valid provider (like Google)
    // to prevent the user from locking themselves out of their account.
    return hasGoogle && isEmailProvider;
  }, [hasGoogle, isEmailProvider]);

  const handleUnlink = () => {
    if (!activeUser) return;

    if (!canUnlink) {
      showToast(
        "Não é possível desativar: esta senha é seu único método de acesso à conta.",
        "error"
      );
      return;
    }

    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setUnlinkPassword("");
  };

  const executeUnlink = async () => {
    const user = authPrimary.currentUser;
    if (!user || !user.email) {
      showToast("Sessão inválida ou expirada. Faça login novamente.", "error");
      return;
    }
    if (!unlinkPassword) {
      showToast("Informe sua senha atual.", "error");
      return;
    }

    setIsUnlinking(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, unlinkPassword);
      await reauthenticateWithCredential(user, credential);
      await unlink(user, "password");
      try {
        await user.reload();
      } catch {}
      closeConfirmModal();
      setIsLinkedManual(false);
      localStorage.setItem("dismiss_email_pass_banner_v1", "true");
      await onRefreshUser?.();
      showToast("Acesso por e-mail e senha desativado com sucesso!", "success");
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        const { lockedUntil } = await registerFailedAttempt();
        if (lockedUntil) {
          closeConfirmModal();
          showToast("Muitas tentativas falhas. Cofre bloqueado temporariamente.", "error");
          await lockVault();
        } else {
          showToast("Senha atual incorreta.", "error");
        }
      } else if (err.code === "auth/too-many-requests") {
        showToast("Muitas tentativas. Tente novamente mais tarde.", "error");
      } else if (err.code === "auth/network-request-failed") {
        showToast("Falha de conexão. Verifique sua internet e tente novamente.", "error");
      } else if (err.code === "auth/user-mismatch" || err.code === "auth/user-not-found" || err.code === "auth/user-token-expired") {
        showToast("Sessão inválida ou expirada. Faça login novamente.", "error");
      } else if (err.code === "auth/requires-recent-login") {
        showToast("Por segurança, esta operação exige autenticação recente. Faça login novamente antes de desvincular.", "error");
      } else if (err.code === "auth/no-such-provider") {
        closeConfirmModal();
        setIsLinkedManual(false);
        showToast("Este método não está ativo na sua conta.", "info");
      } else {
        console.error("[AccountTab] Erro ao desvincular senha:", err);
        showToast("Erro ao desativar o acesso por senha. Tente novamente.", "error");
      }
    } finally {
      setIsUnlinking(false);
    }
  };

  return { isEmailProvider, canUnlink, isUnlinking, setIsLinkedManual, handleUnlink, showConfirmModal, closeConfirmModal, executeUnlink, unlinkPassword, setUnlinkPassword };
}

