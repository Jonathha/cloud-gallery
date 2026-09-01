import React from 'react';

interface ChangeVaultPinFormProps {
  currentVaultPin: string;
  setCurrentVaultPin: (val: string) => void;
  newVaultPin: string;
  setNewVaultPin: (val: string) => void;
  confirmNewVaultPin: string;
  setConfirmNewVaultPin: (val: string) => void;
  isUpdatingVaultPin: boolean;
  handleChangeVaultPin: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
}

export function ChangeVaultPinForm({
  currentVaultPin,
  setCurrentVaultPin,
  newVaultPin,
  setNewVaultPin,
  confirmNewVaultPin,
  setConfirmNewVaultPin,
  isUpdatingVaultPin,
  handleChangeVaultPin,
  onCancel
}: ChangeVaultPinFormProps) {
  return (
    <div 
      className="p-4 space-y-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (currentVaultPin && newVaultPin && confirmNewVaultPin) {
            handleChangeVaultPin(e as any);
          }
        }
      }}
    >
      <h4 className="text-sm font-medium text-white mb-2">
        Alterar Senha do Cofre Principal
      </h4>
      
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Senha do Cofre Atual</label>
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
          placeholder="Senha atual do cofre"
          value={currentVaultPin}
          onChange={(e) => setCurrentVaultPin(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
        />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Nova Senha do Cofre (6 a 30 caracteres)</label>
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
          placeholder="Nova senha do cofre"
          value={newVaultPin}
          onChange={(e) => setNewVaultPin(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          minLength={6}
          maxLength={30}
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
          placeholder="Confirme a nova senha"
          value={confirmNewVaultPin}
          onChange={(e) => setConfirmNewVaultPin(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          minLength={6}
          maxLength={30}
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
          onClick={handleChangeVaultPin as any}
          disabled={isUpdatingVaultPin}
          className="flex-1 py-2 px-4 bg-teal-500 hover:bg-teal-400 text-white font-medium rounded-xl transition-all disabled:opacity-50"
        >
          {isUpdatingVaultPin ? 'Salvando...' : 'Salvar Nova Senha'}
        </button>
      </div>
    </div>
  );
}
