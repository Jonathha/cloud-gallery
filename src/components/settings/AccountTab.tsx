import React from "react";
import { motion } from "motion/react";
import { User, Shield } from "lucide-react";
import { authPrimary } from "../../firebase";
import { usePasswordChangeLogic } from "../../hooks/usePasswordChangeLogic";
import { UserProfileHeader } from "./account/UserProfileHeader";
import { AccountActions } from "./account/AccountActions";
import { useAccountTabUnlink } from "./account/useAccountTabUnlink";
import { AccountPasswordOrLinkSection } from "./account/AccountPasswordOrLinkSection";
import UnlinkPasswordModal from "./account/UnlinkPasswordModal";

interface AccountTabProps {
  user: any;
  isInstallable: boolean;
  promptToInstall: () => void;
  isInIframe: boolean;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  logOut: () => void;
  onClose?: () => void;
}

export default function AccountTab({ user, showToast, logOut }: AccountTabProps) {
  const [currentUserState, setCurrentUserState] = React.useState(() => authPrimary.currentUser || user);

  const refreshUserData = async () => {
    try {
      if (authPrimary.currentUser) {
        await authPrimary.currentUser.reload();
        setCurrentUserState(authPrimary.currentUser);
      }
    } catch (e) {
      console.warn("[AccountTab] Erro ao recarregar dados do usuário:", e);
    }
  };

  const activeUser = authPrimary.currentUser || currentUserState;
  const { isEmailProvider, canUnlink, isUnlinking, setIsLinkedManual, handleUnlink, showConfirmModal, closeConfirmModal, executeUnlink, unlinkPassword, setUnlinkPassword } = useAccountTabUnlink({
    activeUser,
    showToast,
    onRefreshUser: refreshUserData,
  });
  const pwLogic = usePasswordChangeLogic(activeUser, showToast);

  const onLinkSuccess = async () => {
    setIsLinkedManual(true);
    await refreshUserData();
    localStorage.setItem("dismiss_email_pass_banner_v1", "true");
  };

  return (
    <div className="space-y-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-1.5"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
            <User size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Sua Conta
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Gerencie seus dados de acesso, login e sessão ativa.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Cartão de Perfil do Usuário */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
        <UserProfileHeader user={currentUserState} />
      </motion.div>

      {/* Seção de Credenciais de Acesso da Conta */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="space-y-2.5"
      >
        <div className="px-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Acesso & Credenciais
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            Login na Nuvem
          </span>
        </div>

        <AccountPasswordOrLinkSection
          isEmailProvider={isEmailProvider}
          canUnlink={canUnlink}
          isChangingPassword={pwLogic.isChangingPassword}
          setIsChangingPassword={pwLogic.setIsChangingPassword}
          passwordProps={pwLogic}
          onUnlink={handleUnlink}
          isUnlinking={isUnlinking}
          onLinkSuccess={onLinkSuccess}
          showToast={showToast}
        />
      </motion.div>

      {/* Seção de Sessão / Logout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15 }}
        className="space-y-2.5 pt-2"
      >
        <div className="px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Gerenciamento de Sessão
          </span>
        </div>

        <AccountActions logOut={logOut} />
      </motion.div>

      {/* Modal de Confirmação para Desativar Acesso por Senha */}
      <UnlinkPasswordModal
        isOpen={showConfirmModal}
        isLoading={isUnlinking}
        password={unlinkPassword}
        onPasswordChange={setUnlinkPassword}
        onClose={closeConfirmModal}
        onConfirm={executeUnlink}
      />
    </div>
  );
}
