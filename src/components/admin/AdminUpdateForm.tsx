import React from 'react';
import { Check, Loader2, CheckSquare, Square } from 'lucide-react';

interface AdminUpdateFormProps {
  version: string;
  setVersion: (v: string) => void;
  buildNumber: string;
  setBuildNumber: (b: string) => void;
  required: boolean;
  setRequired: (r: boolean) => void;
  securityCode: string;
  setSecurityCode: (c: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AdminUpdateForm({
  version,
  setVersion,
  buildNumber,
  setBuildNumber,
  required,
  setRequired,
  securityCode,
  setSecurityCode,
  saving,
  onSubmit,
}: AdminUpdateFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-zinc-900/30 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campo 1: Versão do Aplicativo */}
          <div className="space-y-2">
            <label htmlFor="app-version" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Versão do Aplicativo
            </label>
            <input
              id="app-version"
              type="text"
              placeholder="Ex: 2.1"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all font-mono"
            />
            <p className="text-[11px] text-zinc-600">Representação em string da versão principal.</p>
          </div>

          {/* Campo 2: Build Number */}
          <div className="space-y-2">
            <label htmlFor="build-number" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Build Number (Código da Versão)
            </label>
            <input
              id="build-number"
              type="text"
              placeholder="Ex: 210"
              value={buildNumber}
              onChange={(e) => setBuildNumber(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all font-mono"
            />
            <p className="text-[11px] text-zinc-600">Identificador numérico inteiro e incremental para checagem nativa.</p>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Campo 3: Código de Segurança (Nova 3a Verificação) */}
        <div className="space-y-2">
          <label htmlFor="security-code" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            Código de Segurança do App (3ª Verificação)
          </label>
          <input
            id="security-code"
            type="text"
            placeholder="Ex: SEGREDO123 (Deixe vazio para desativar)"
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all font-mono"
          />
          <p className="text-[11px] text-zinc-500">
            Se preenchido, o site exigirá que o aplicativo injete este código exato (através da função JavaScript bridge). Se o código não for injetado ou for incorreto, o aplicativo será forçado a atualizar para a versão oficial que possua o código correto.
          </p>
        </div>

        <hr className="border-white/5" />

        {/* Campo 4: Exigir Atualização Obrigatória */}
        <div className="flex items-start gap-4 p-4 bg-zinc-950/40 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
          <button
            type="button"
            id="required-toggle"
            onClick={() => setRequired(!required)}
            className="mt-1 shrink-0 text-zinc-400 hover:text-white transition-colors"
          >
            {required ? (
              <CheckSquare size={20} className="text-white" />
            ) : (
              <Square size={20} className="text-zinc-600" />
            )}
          </button>
          <div className="space-y-1">
            <label
              onClick={() => setRequired(!required)}
              className="text-sm font-semibold text-white select-none cursor-pointer"
            >
              Exigir Atualização Obrigatória
            </label>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Se ativado, remove os botões de fechar, pular ou ignorar o aviso no aplicativo do usuário comum, bloqueando totalmente o uso até que o processo de download e instalação seja iniciado.
            </p>
          </div>
        </div>

      </div>

      {/* Botão de Salvar */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white transition-all rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>SALVANDO...</span>
            </>
          ) : (
            <>
              <Check size={16} strokeWidth={2.5} />
              <span>SALVAR ATUALIZAÇÕES</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
