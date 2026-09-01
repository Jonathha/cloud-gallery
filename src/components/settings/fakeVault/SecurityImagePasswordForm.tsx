import React from 'react';
import { Key } from 'lucide-react';

interface SecurityImagePasswordFormProps {
  extraPassword: string | null;
  currentPass: string;
  setCurrentPass: (val: string) => void;
  newPass: string;
  setNewPass: (val: string) => void;
  confirmNewPass: string;
  setConfirmNewPass: (val: string) => void;
  isUpdatingPassword: boolean;
  handleSavePasswordChange: (e: React.FormEvent) => Promise<void>;
}

export function SecurityImagePasswordForm({
  extraPassword,
  currentPass,
  setCurrentPass,
  newPass,
  setNewPass,
  confirmNewPass,
  setConfirmNewPass,
  isUpdatingPassword,
  handleSavePasswordChange
}: SecurityImagePasswordFormProps) {
  return (
    <div 
      className="space-y-4 mb-8"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if ((!extraPassword || currentPass) && newPass && confirmNewPass) {
            handleSavePasswordChange(e as any);
          }
        }
      }}
    >
      <label className="block text-sm font-medium text-zinc-400">
        {extraPassword ? '1. Alterar a Senha de Segurança (até 15 caracteres)' : '1. Definir Senha de Segurança (até 15 caracteres)'}
      </label>
      
      {extraPassword && (
        <div className="space-y-2">
          <label className="block text-xs text-zinc-500 font-medium">Senha de Segurança Atual</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
              <Key size={18} />
            </div>
            <input
              type="text"
              name="settings-current-extra-input"
              id="settings-current-extra-input"
              style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              maxLength={15}
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Digite a senha de segurança atual"
              className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs text-zinc-500 font-medium">
          {extraPassword ? 'Nova Senha de Segurança' : 'Criar Senha de Segurança'}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
            <Key size={18} />
          </div>
          <input
            type="text"
            name="settings-new-extra-input"
            id="settings-new-extra-input"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            maxLength={15}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder={extraPassword ? "Digite a nova senha de segurança" : "Digite a nova senha de segurança (até 15 caracteres)"}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-zinc-500 font-medium">Confirmar Nova Senha de Segurança</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
            <Key size={18} />
          </div>
          <input
            type="text"
            name="settings-confirm-extra-input"
            id="settings-confirm-extra-input"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            maxLength={15}
            value={confirmNewPass}
            onChange={(e) => setConfirmNewPass(e.target.value)}
            placeholder="Confirme a nova senha de segurança"
            className="w-full bg-zinc-900/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSavePasswordChange as any}
        disabled={isUpdatingPassword || newPass.length === 0 || confirmNewPass.length === 0}
        className="w-full py-3 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
      >
        {isUpdatingPassword ? 'Atualizando...' : extraPassword ? 'Salvar Nova Senha de Segurança' : 'Definir Senha de Segurança'}
      </button>
    </div>
  );
}
