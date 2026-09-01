import React, { useEffect } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { reportProbe } from '../utils/securityInterceptor';

export default function CleanNotFoundView() {
  useEffect(() => {
    // Notify backend security engine about probing invalid path
    reportProbe(window.location.pathname);
  }, []);

  const handleGoHome = () => {
    window.location.href = window.location.origin;
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-neutral-200 flex flex-col items-center justify-center p-4 selection:bg-neutral-800">
      <div className="w-full max-w-md bg-[#141414] border border-neutral-800/80 rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
        <div className="mx-auto w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400">
          <AlertCircle className="w-6 h-6 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight">
            Página indisponível
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Esta página não existe ou não está disponível.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleGoHome}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm transition-colors flex items-center justify-center gap-2 border border-neutral-700/50"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
