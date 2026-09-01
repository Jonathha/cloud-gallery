import React from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { AppConfig } from '../../hooks/useAppUpdate';

interface UpdatePromptViewProps {
  appConfig: AppConfig | null;
  currentRequiredVersion: string;
  isApkInCache: boolean;
  apkSize: string | null;
  isSecurityMismatch?: boolean;
  handleUpdate: () => void;
}

export function UpdatePromptView({
  appConfig,
  currentRequiredVersion,
  isApkInCache,
  apkSize,
  isSecurityMismatch,
  handleUpdate,
}: UpdatePromptViewProps) {
  const title = isSecurityMismatch 
    ? 'Verificação de Segurança' 
    : (appConfig?.required ? 'Atualização Obrigatória' : 'Atualização Disponível');

  const description = isSecurityMismatch
    ? 'O aplicativo identificou uma inconsistência de assinatura ou código de segurança. Instale a versão oficial para restabelecer seu acesso seguro.'
    : `O aplicativo requer a versão v${currentRequiredVersion} para continuar funcionando de forma estável e segura.`;

  return (
    <div className="w-full space-y-4">
      {/* Title & Description */}
      <div className="space-y-1.5 text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-zinc-300 tracking-wider uppercase mb-1">
          <span>Versão {currentRequiredVersion}</span>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white leading-snug">
          {title}
        </h2>
        <p className="text-zinc-400 text-xs px-1 leading-relaxed">
          {description}
        </p>

        {isApkInCache && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Atualização pronta em cache {apkSize ? `(${apkSize})` : ''}</span>
          </div>
        )}
      </div>

      {/* Primary Action Button (EM CIMA) */}
      <button
        onClick={handleUpdate}
        className="w-full py-3.5 px-4 bg-white hover:bg-zinc-200 active:scale-[0.99] text-black font-bold text-sm rounded-xl flex flex-col items-center justify-center gap-0.5 shadow-lg cursor-pointer transition-all"
      >
        <div className="flex items-center gap-2">
          <ArrowUpCircle size={18} />
          <span className="tracking-wide uppercase">
            {isApkInCache ? 'INSTALAR AGORA' : 'ATUALIZAR AGORA'}
          </span>
        </div>
        {isApkInCache && (
          <span className="text-[10px] text-zinc-600 font-normal normal-case">
            Instalação local rápida (sem gastar dados)
          </span>
        )}
      </button>

      {/* New Features List */}
      <div className="w-full space-y-2 pt-1">
        <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase block text-left pl-0.5">
          Novidades no app
        </span>
        <div className="w-full space-y-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 text-left">
          <div className="flex gap-2.5 items-start">
            <div className="w-4 h-4 rounded bg-zinc-800 border border-white/10 flex items-center justify-center text-[9px] text-zinc-300 font-bold shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-zinc-200 tracking-wide">Melhorias de Estabilidade</h4>
              <p className="text-zinc-400 text-[10px] mt-0.5 leading-normal">
                Melhor processamento das mídias protegidas.
              </p>
            </div>
          </div>

          <div className="h-px bg-zinc-800/60" />

          <div className="flex gap-2.5 items-start">
            <div className="w-4 h-4 rounded bg-zinc-800 border border-white/10 flex items-center justify-center text-[9px] text-zinc-300 font-bold shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-zinc-200 tracking-wide">Interface Organizada</h4>
              <p className="text-zinc-400 text-[10px] mt-0.5 leading-normal">
                Layout simplificado, carregamento mais rápido e otimizado para celulares.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

