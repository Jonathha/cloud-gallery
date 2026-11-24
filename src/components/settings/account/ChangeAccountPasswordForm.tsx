import React from 'react';

interface ChangeAccountPasswordFormProps {
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isLoading: boolean;
  isSendingEmail: boolean;
  handleChangePassword: (e: React.FormEvent) => Promise<void>;
  handleSendResetEmail: () => Promise<void>;
  onCancel: () => void;
}

export function ChangeAccountPasswordForm({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isLoading,
  isSendingEmail,
  handleChangePassword,
  handleSendResetEmail,
  onCancel
}: ChangeAccountPasswordFormProps) {
  return (
    <div 
      className="p-4 space-y-4"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (currentPassword && newPassword && confirmPassword) {
            handleChangePassword(e as any);
          }
        }
      }}
    >
      <h4 className="text-sm font-medium text-white mb-2">Alterar Senha</h4>
      <div>
        <input
          type="text"
          style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          placeholder="Senha atual"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30"
        />
        <div className="text-right mt-1.5">
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={isSendingEmail}
            className="text-xs text-zinc-400 hover:text-white transition-all focus:outline-none disabled:opacity-50"
          >
            {isSendingEmail ? 'Enviando link...' : 'Esqueceu a senha atual? Redefinir por e-mail'}
          </button>
        </div>
      </div>
      <div>
        <input
          type="text"
          style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          placeholder="Nova senha"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30"
        />
      </div>
      <div>
        <input
          type="text"
          style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          placeholder="Confirmar nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleChangePassword as any}
          disabled={isLoading}
          className="flex-1 py-2 px-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all disabled:opacity-50"
        >
          {isLoading ? 'Salvando...' : 'Salvar Senha'}
        </button>
      </div>
    </div>
  );
}
