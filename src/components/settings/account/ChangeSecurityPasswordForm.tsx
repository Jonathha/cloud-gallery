import React from 'react';

interface ChangeSecurityPasswordFormProps {
  extraPassword: string | null;
  currentExtraPassword: string;
  setCurrentExtraPassword: (val: string) => void;
  newExtraPasswordState: string;
  setNewExtraPasswordState: (val: string) => void;
  confirmNewExtraPassword: string;
  setConfirmNewExtraPassword: (val: string) => void;
  isUpdatingExtraPassword: boolean;
  handleChangeExtraPassword: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function ChangeSecurityPasswordForm({
  extraPassword,
  currentExtraPassword,
  setCurrentExtraPassword,
  newExtraPasswordState,
  setNewExtraPasswordState,
  confirmNewExtraPassword,
  setConfirmNewExtraPassword,
  isUpdatingExtraPassword,
  handleChangeExtraPassword,
  onCancel
}: ChangeSecurityPasswordFormProps) {
  return (
    <div 
      className="p-4 space-y-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if ((!extraPassword || currentExtraPassword) && newExtraPasswordState && confirmNewExtraPassword) {
            handleChangeExtraPassword(e as any);
          }
        }
      }}
    >
      <h4 className="text-sm font-medium text-white mb-2">
        {extraPassword ? 'Alterar Senha de Segurança' : 'Definir Senha de Segurança'}
      </h4>
      
      {extraPassword && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Senha de Segurança Atual</label>
          <input
            type="text"
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            maxLength={15}
            placeholder="Senha de segurança atual"
            value={currentExtraPassword}
            onChange={(e) => setCurrentExtraPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>
      )}

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Nova Senha de Segurança (até 15 caracteres)</label>
        <input
          type="text"
          style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          maxLength={15}
          placeholder="Nova senha de segurança"
          value={newExtraPasswordState}
          onChange={(e) => setNewExtraPasswordState(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Confirmar Nova Senha</label>
        <input
          type="text"
          style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          maxLength={15}
          placeholder="Confirme a nova senha"
          value={confirmNewExtraPassword}
          onChange={(e) => setConfirmNewExtraPassword(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 bg-zinc-700/50 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleChangeExtraPassword as any}
          disabled={isUpdatingExtraPassword}
          className="flex-1 py-2 px-4 bg-teal-500 hover:bg-teal-400 text-white font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {isUpdatingExtraPassword ? 'Salvando...' : 'Salvar Senha'}
        </button>
      </div>
    </div>
  );
}
