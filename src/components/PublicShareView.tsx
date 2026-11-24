import React from 'react';
import { Loader2, RefreshCw, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import PublicPasswordPrompt from './PublicPasswordPrompt';
import PublicMediaFrame from './PublicMediaFrame';
import PublicQueueView from './publicShare/PublicQueueView';
import Turnstile from './Turnstile';
import { usePublicShareLogic } from '../hooks/usePublicShareLogic';

export default function PublicShareView() {
  const s = usePublicShareLogic();

  if (s.isHighDemand) {
    return <PublicQueueView />;
  }

  if (s.loading) {

    return (
      <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center text-zinc-400 gap-4">
        <Loader2 className="w-10 h-10 text-white animate-spin" strokeWidth={1.5} />
      </div>
    );
  }

  if (s.showCaptcha) {
    return (
      <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center p-4 text-center select-none selection:bg-zinc-800 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(24,24,27,0.45),transparent_70%)] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#09090b]/95 backdrop-blur-2xl border border-zinc-800/80 shadow-2xl flex flex-col items-center space-y-6 relative overflow-hidden"
        >
          <div className="relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300">
            {s.captchaStatus === 'success' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full h-full rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-inner"
              >
                <CheckCircle2 className="w-7 h-7 stroke-[1.75]" />
              </motion.div>
            ) : s.captchaStatus === 'verifying' ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full h-full rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400"
              >
                <RefreshCw className="w-6 h-6 stroke-[1.75] animate-spin" />
              </motion.div>
            ) : (
              <div className="w-full h-full rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-center text-zinc-200 shadow-sm">
                <ShieldCheck className="w-7 h-7 stroke-[1.5]" />
              </div>
            )}
          </div>

          <div className="space-y-1.5 text-center">
            <h2 className="text-lg sm:text-xl font-medium text-white tracking-tight">
              {s.captchaStatus === 'success' 
                ? 'Verificado com Sucesso' 
                : s.captchaStatus === 'verifying' 
                ? 'Validando Integridade...' 
                : 'Verificação de Segurança'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
              {s.captchaStatus === 'success' 
                ? 'Liberando chave de descriptografia...' 
                : s.captchaStatus === 'verifying' 
                ? 'Confirmando integridade da conexão segura...' 
                : 'Para acessar este arquivo criptografado, complete a validação de segurança.'}
            </p>
          </div>

          <div className="py-1 flex justify-center items-center min-h-[75px] w-full">
            <Turnstile
              key={s.turnstileKey}
              sitekey="0x4AAAAAADwFk_xfBTRfVhyq"
              onChange={s.handleTurnstileVerify}
              theme="dark"
            />
          </div>

          <AnimatePresence>
            {s.error && (
              <motion.div 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-medium w-full"
              >
                {s.error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2 border-t border-zinc-900/90 flex items-center justify-between text-[11px] text-zinc-500 w-full px-1">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-zinc-400" />
              <span>Criptografia E2EE</span>
            </div>
            <span className="text-zinc-600">Anti-Abuso Ativo</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (s.error && !s.decryptedUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-sm w-full p-8 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-2xl flex flex-col items-center">
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mb-2">
            Acesso Restrito / Expirado
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            {s.error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <RefreshCw size={14} /> Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  // If requires password and not decrypted yet
  if (s.shareData?.options?.requirePassword && !s.decryptedUrl) {
    return (
      <PublicPasswordPrompt
        password={s.password}
        setPassword={s.setPassword}
        decrypting={s.decrypting}
        error={s.error}
        onSubmit={s.handlePasswordSubmit}
      />
    );
  }

  const oneTimeView = s.shareData?.options?.oneTimeView;
  const allowDownload = s.shareData?.options?.allowDownload && !oneTimeView;
  const isVideo = s.shareData?.contentType?.startsWith('video/');

  return (
    <PublicMediaFrame
      decryptedUrl={s.decryptedUrl}
      allowDownload={allowDownload}
      isVideo={isVideo || false}
      isDownloadingChunks={s.isDownloadingChunks}
      downloadProgress={s.downloadProgress}
      shareData={s.shareData}
      timeLeft={s.timeLeft}
    />
  );
}
