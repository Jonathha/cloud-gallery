import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface PublicPasswordPromptProps {
  /**
   * Password character sequence input by viewer
   */
  password: string;
  /**
   * State setter for the active password text sequence
   */
  setPassword: (value: string) => void;
  /**
   * Flag representing progress of ongoing server-decrypt actions
   */
  decrypting: boolean;
  /**
   * Local decryption failure warnings or server indicators
   */
  error: string;
  /**
   * Action of verifying correct derived key against master lock
   */
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * PublicPasswordPrompt renders the secure lock shield interface.
 * When images or video content is protected via end-to-end encrypt passphrases,
 * this UI asks the visitor to input the secret phrase to perform local decryption.
 */
export default function PublicPasswordPrompt({
  password,
  setPassword,
  decrypting,
  error,
  onSubmit
}: PublicPasswordPromptProps) {
  return (
    <div id="public-password-wrapper" className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div 
        id="public-password-card" 
        className="bg-zinc-950 border border-zinc-900 rounded-3xl w-full max-w-md overflow-hidden p-6 sm:p-8 shadow-2xl relative"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-700" />
        
        <div className="flex flex-col items-center text-center">
          <h3 className="font-light text-white text-xl tracking-tight mb-2 mt-4">Autenticação Necessária</h3>
          <p className="text-xs text-zinc-500 max-w-xs mb-8">
            Insira a credencial para acesso ao conteúdo restrito.
          </p>

          {/* Validation Error Notices */}
          {error && (
            <div className="w-full p-3 bg-red-950/20 border border-red-900/60 rounded-xl text-red-400 text-[11px] text-left mb-4 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit credentials */}
          <div 
            className="w-full flex flex-col gap-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (password) {
                  onSubmit(e as any);
                }
              }
            }}
          >
            <div className="relative">
              <input 
                id="share-password-input-field"
                type="text"
                style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck="false"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                placeholder="Digitar senha de acesso..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={decrypting}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-zinc-500 font-mono text-center tracking-widest placeholder:tracking-normal placeholder:font-sans"
              />
            </div>

            <button
              id="share-btn-unlock"
              type="button"
              onClick={onSubmit as any}
              disabled={decrypting}
              className="w-full py-3 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {decrypting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-black" />
                  <span>Descriptografando...</span>
                </>
              ) : (
                <>
                  <span>Autenticar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
