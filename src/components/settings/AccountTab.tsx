import React from "react";
import { motion } from "framer-motion";
import { usePasswordChangeLogic } from "../../hooks/usePasswordChangeLogic";
import { authPrimary } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useAccountSettingsLogic } from "../../hooks/settings/useAccountSettingsLogic";
import { AccountActions } from "./account/AccountActions";
import { UserProfileHeader } from "./account/UserProfileHeader";
import { AccountPasswordFormSection } from "./account/AccountPasswordFormSection";
import { SecurityPasswordFormSection } from "./account/SecurityPasswordFormSection";
import { VaultPinFormSection } from "./account/VaultPinFormSection";
import { LinkEmailPasswordFormSection } from "./account/LinkEmailPasswordFormSection";
import { unlink } from "firebase/auth";

interface AccountTabProps {
  user: any;
  isInstallable: boolean;
  promptToInstall: () => void;
  isInIframe: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  logOut: () => void;
  onClose?: () => void;
}

export default function AccountTab({
  user,
  showToast,
  logOut,
  onClose,
}: AccountTabProps) {
  const activeUser = authPrimary.currentUser || user;
  const [isLinkedManual, setIsLinkedManual] = React.useState<boolean | null>(null);
  const [isUnlinking, setIsUnlinking] = React.useState(false);

  const isEmailProvider = React.useMemo(() => {
    if (isLinkedManual === true) return true;
    if (isLinkedManual === false) return false;
    return (
      activeUser?.providerData?.some((p: any) => p.providerId === "password") ||
      (!activeUser?.providerData && activeUser?.email)
    );
  }, [isLinkedManual, activeUser]);

  const handleUnlink = async () => {
    if (!activeUser) return;

    if (
      !window.confirm(
        "Tem certeza que deseja desativar o acesso por e-mail e senha? Você ainda poderá fazer login normalmente usando sua conta Google."
      )
    ) {
      return;
    }

    setIsUnlinking(true);
    try {
      await unlink(activeUser, "password");
      setIsLinkedManual(false);
      localStorage.setItem("dismiss_email_pass_banner_v1", "true");
      showToast("Acesso por e-mail e senha desativado com sucesso!", "success");
    } catch (err: any) {
      console.error("[AccountTab] Erro ao desvincular senha:", err);
      showToast(err.message || "Erro ao desativar o acesso por senha.", "error");
    } finally {
      setIsUnlinking(false);
    }
  };

  const {
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
  } = usePasswordChangeLogic(user, showToast);

  const {
    extraPassword,
    cryptoKey,
    lockVault,
    updateExtraPassword,
    changeVaultPin,
    registerFailedAttempt,
    resetFailedAttempts,
  } = useAuth();

  const {
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
  } = useAccountSettingsLogic({
    showToast,
    onClose,
    extraPassword,
    cryptoKey,
    lockVault,
    updateExtraPassword,
    changeVaultPin,
    registerFailedAttempt,
    resetFailedAttempts,
  });

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-white mb-2">Sua Conta</h3>
        <p className="text-sm text-zinc-400 mb-6">
          Gerencie sua sessão e informações de acesso.
        </p>

        <div className="p-5 bg-zinc-900/50 border border-white/10 rounded-2xl space-y-6">
          <UserProfileHeader user={user} />

          <div className="pt-4 border-t border-white/10 space-y-3">
            {isEmailProvider ? (
              <AccountPasswordFormSection
                isChangingPassword={isChangingPassword}
                setIsChangingPassword={setIsChangingPassword}
                passwordProps={{
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
                }}
                onUnlink={handleUnlink}
                isUnlinking={isUnlinking}
              />
            ) : (
              <LinkEmailPasswordFormSection
                onLinkSuccess={() => {
                  setIsLinkedManual(true);
                  localStorage.setItem("dismiss_email_pass_banner_v1", "true");
                }}
                showToast={showToast}
              />
            )}

            <SecurityPasswordFormSection
              isChangingExtraPassword={isChangingExtraPassword}
              setIsChangingExtraPassword={setIsChangingExtraPassword}
              extraPassword={extraPassword}
              securityProps={{
                currentExtraPassword,
                setCurrentExtraPassword,
                newExtraPasswordState,
                setNewExtraPasswordState,
                confirmNewExtraPassword,
                setConfirmNewExtraPassword,
                isUpdatingExtraPassword,
                handleChangeExtraPassword,
              }}
            />

            <VaultPinFormSection
              isChangingVaultPin={isChangingVaultPin}
              setIsChangingVaultPin={setIsChangingVaultPin}
              vaultProps={{
                currentVaultPin,
                setCurrentVaultPin,
                newVaultPin,
                setNewVaultPin,
                confirmNewVaultPin,
                setConfirmNewVaultPin,
                isUpdatingVaultPin,
                handleChangeVaultPin,
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <AccountActions logOut={logOut} />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
