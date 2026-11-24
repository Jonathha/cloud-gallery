import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, RefreshCw, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Turnstile from './Turnstile';
import { getApiUrl } from '../utils/apiUrl';
import { resetSecurityState } from '../utils/securityInterceptor';

interface BlockedPageProps {
  module?: string;
  isBlocked?: boolean;
  reason?: string;
  onVerified?: () => void;
}

export default function BlockedPage({ module, isBlocked, reason, onVerified }: BlockedPageProps) {
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(1);

  const handleCaptchaChange = async (captchaTokenValue: string | null) => {
    if (!captchaTokenValue || verifying || verifiedSuccess) return;

    setVerifying(true);
    setErrorMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const pathShareMatch = window.location.pathname.match(/\/api\/share\/(?:view|download|raw|status)\/([a-zA-Z0-9_-]+)/);
      const currentShareId = urlParams.get('share') || (pathShareMatch ? pathShareMatch[1] : undefined);

      const res = await fetch(getApiUrl('/api/verify-recaptcha'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: captchaTokenValue, module, shareId: currentShareId })
      });
      const data = await res.json();

      if (data && data.success) {
        if (data.clearanceToken) {
          try {
            if (currentShareId) {
              sessionStorage.setItem(`captcha_clearance_${currentShareId}`, data.clearanceToken);
              localStorage.setItem(`captcha_clearance_${currentShareId}`, data.clearanceToken);
            }
            sessionStorage.setItem('captcha_clearance', data.clearanceToken);
            localStorage.setItem('captcha_clearance', data.clearanceToken);
          } catch (e) {}
        }

        setVerifiedSuccess(true);
        // Transição suave garantindo propagação do token
        await new Promise(resolve => setTimeout(resolve, 500));
        resetSecurityState(module);
        if (module === 'share_view' || module === 'share') {
          resetSecurityState('share_view');
          resetSecurityState('share');
        }

        if (onVerified) {
          onVerified();
        } else {
          window.location.reload();
        }
      } else {
        setErrorMsg(data?.error || 'Falha na verificação de segurança. Tente novamente.');
        setTurnstileKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error verifying captcha on block page:', err);
      setErrorMsg('Erro de conexão ao verificar segurança. Tente novamente.');
      setTurnstileKey(prev => prev + 1);
    } finally {
      setVerifying(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#070708] text-zinc-200 flex flex-col items-center justify-center p-4 selection:bg-zinc-800">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md bg-[#09090b]/95 backdrop-blur-2xl border border-red-500/25 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-radial-gradient from-red-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-7 h-7 stroke-[1.5]" />
          </div>

          <div className="relative space-y-2">
            <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight">
              Acesso Suspenso Temporariamente
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed font-normal">
              {reason || 'Esta conexão foi temporariamente pausada para prevenção de abuso automatizado. Por favor, aguarde alguns instantes.'}
            </p>
          </div>

          <div className="relative pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium rounded-xl border border-white/5 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar Novamente
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-200 flex flex-col items-center justify-center p-4 selection:bg-zinc-800 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(24,24,27,0.45),transparent_70%)] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md bg-[#09090b]/95 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden space-y-6"
      >
        <div className="relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300">
          {verifiedSuccess ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full h-full rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-inner"
            >
              <CheckCircle2 className="w-7 h-7 stroke-[1.75]" />
            </motion.div>
          ) : verifying ? (
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
          <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight">
            {verifiedSuccess ? 'Verificado com Sucesso' : verifying ? 'Validando Integridade...' : 'Verificação de Segurança'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {verifiedSuccess 
              ? 'Conexão autorizada. Carregando dados criptografados...' 
              : verifying 
              ? 'Confirmando autenticidade junto à rede de proteção...' 
              : 'Para garantir a privacidade e proteção dos arquivos criptografados, complete o desafio abaixo.'}
          </p>
        </div>

        <div className="py-1 flex justify-center items-center min-h-[75px] w-full">
          <Turnstile
            key={turnstileKey}
            sitekey="0x4AAAAAADwFk_xfBTRfVhyq"
            onChange={handleCaptchaChange}
            theme="dark"
          />
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 font-medium"
            >
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-2 border-t border-zinc-900/90 flex items-center justify-between text-[11px] text-zinc-500 px-1">
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
