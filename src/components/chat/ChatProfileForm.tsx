import React, { useState } from 'react';
import { Loader2, User } from 'lucide-react';

interface ChatProfileFormProps {
  onRegister: (nickname: string) => Promise<void>;
  registering: boolean;
}

export default function ChatProfileForm({ onRegister, registering }: ChatProfileFormProps) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("O apelido não pode estar em branco.");
      return;
    }

    if (trimmed.length > 15) {
      setError("O apelido deve ter no máximo 15 caracteres.");
      return;
    }

    const regex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/;
    if (!regex.test(trimmed)) {
      setError("O apelido deve conter apenas letras e espaços.");
      return;
    }

    setError(null);
    try {
      await onRegister(trimmed);
    } catch (err: any) {
      setError(err.message || "Erro ao registrar. Tente novamente.");
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-[340px] bg-zinc-950/40 border border-white/[0.08] p-6 rounded-2xl space-y-5 shadow-xl backdrop-blur-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-white/[0.04] border border-white/10 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
            <User size={20} />
          </div>
          <h3 className="text-base font-semibold text-zinc-100">Crie seu apelido</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Escolha um apelido curto para ser identificado no chat. Ele será visível para todos os participantes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Apelido</label>
            <input
              type="text"
              maxLength={15}
              placeholder="Ex: Amanda, Carlos"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError(null);
              }}
              className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-all text-sm font-medium"
            />
          </div>

          {error && (
            <div className="text-red-400 text-[11px] font-medium bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={registering}
            className="w-full py-2.5 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            {registering ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
            ) : (
              "Confirmar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
