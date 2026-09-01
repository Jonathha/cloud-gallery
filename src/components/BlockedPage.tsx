import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react';
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

      const res = await fetch(getApiUrl('/api/verify-recaptcha'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: captchaTokenValue, module })
      });
      const data = await res.json();

      if (data && data.success) {
        setVerifiedSuccess(true);
        // Delay seguro para garantir persistência no Durable Object e transição suave no frontend
        await new Promise(resolve => setTimeout(resolve, 600));
        resetSecurityState(module);
        if (onVerified) {
          onVerified();
        } else {
          window.location.reload();
        }
      } else {
        setErrorMsg(data?.error || 'Falha na verificação de segurança. Tente novamente.');
      }
    } catch (err) {
      console.error('Error verifying captcha on block page:', err);
      setErrorMsg('Erro de conexão ao verificar segurança. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-neutral-200 flex flex-col items-center justify-center p-4 selection:bg-neutral-800">
        <div className="w-full max-w-md bg-[#141414] border border-neutral-800/80 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-6 h-6 stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight">
              Acesso Suspenso Temporariamente
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {reason || 'Esta conta ou IP foi temporariamente bloqueado devido a atividade incomum persistente. Por favor, tente novamente mais tarde.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-neutral-200 flex flex-col items-center justify-center p-4 selection:bg-neutral-800">
      <div className="w-full max-w-md bg-[#141414] border border-neutral-800/80 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
        {verifiedSuccess ? (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6 stroke-[1.5] animate-bounce" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                Verificado com Sucesso
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Desafio concluído. Acessando a aplicação...
              </p>
            </div>
          </>
        ) : verifying ? (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-6 h-6 stroke-[1.5] animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                Validando Desafio...
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Por favor, aguarde um momento.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-6 h-6 stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                Verificação de Atividade
              </h1>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Uma verificação de segurança é necessária para continuar e garantir a integridade da plataforma. Por favor, complete o desafio abaixo.
              </p>
            </div>

            <div className="py-2 flex justify-center">
              <Turnstile
                sitekey="0x4AAAAAADwFk_xfBTRfVhyq"
                onChange={handleCaptchaChange}
                theme="dark"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-400 font-medium animate-fadeIn">
                {errorMsg}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

