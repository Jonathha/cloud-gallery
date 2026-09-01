import React, { useState } from "react";
import { KeyRound, ShieldAlert, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { authPrimary } from "../../../firebase";

interface LinkEmailPasswordFormSectionProps {
  onLinkSuccess: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export function LinkEmailPasswordFormSection({
  onLinkSuccess,
  showToast,
}: LinkEmailPasswordFormSectionProps) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeUser = authPrimary.currentUser;
  const userEmail = activeUser?.email || "";

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeUser || !userEmail) {
      showToast("Usuário não autenticado ou e-mail indisponível.", "error");
      return;
    }

    if (password.length < 6) {
      showToast("A senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }

    if (password.length > 50) {
      showToast("A senha deve ter no máximo 50 caracteres.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showToast("As senhas não coincidem.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(userEmail, password);
      await linkWithCredential(activeUser, credential);
      showToast("Acesso por e-mail e senha ativado com sucesso!", "success");
      setIsExpanding(false);
      setPassword("");
      setConfirmPassword("");
      onLinkSuccess();
    } catch (error: any) {
      console.error("[LinkEmailPassword] Erro ao vincular credenciais:", error);
      if (error.code === "auth/email-already-in-use") {
        showToast("Este e-mail já está associado a outra conta.", "error");
      } else {
        showToast(error.message || "Erro ao vincular e-mail e senha.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-zinc-900/50 rounded-2xl overflow-hidden border border-white/10 mb-3"
    >
      {!isExpanding ? (
        <button
          onClick={() => setIsExpanding(true)}
          className="w-full py-4 px-5 hover:bg-white/5 text-white font-medium transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-850 rounded-xl border border-white/5 text-zinc-400 group-hover:text-white transition-colors">
              <KeyRound size={18} />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm sm:text-base text-zinc-100">Criar Acesso Alternativo</p>
              <p className="text-xs text-zinc-400">Permita login por e-mail e senha diretamente</p>
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500 group-hover:text-zinc-350 transition-colors"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      ) : (
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
            <ShieldAlert size={18} className="text-zinc-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300 leading-relaxed">
              Você pode criar uma senha para acessar esta conta sem precisar fazer login com o Google. Isso é ideal para compartilhar o acesso ou fazer login em outros navegadores.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">E-mail associado</label>
            <input
              type="text"
              readOnly
              value={userEmail}
              className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-4 py-2.5 text-zinc-400 text-sm focus:outline-none cursor-not-allowed select-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Defina uma senha (6 a 50 dígitos)</label>
            <input
              type="text"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
              autoComplete="new-password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Confirme a senha</label>
            <input
              type="text"
              style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
              autoComplete="new-password"
              placeholder="Digite a senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsExpanding(false);
                setPassword("");
                setConfirmPassword("");
              }}
              className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-750 text-white font-medium rounded-xl transition-all text-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleLink}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Ativando...
                </>
              ) : (
                "Ativar Acesso"
              )}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
