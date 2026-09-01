import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VaultSetup() {
  const { setupVault, logOut } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<'standard' | 'custom_extra'>('standard');
  const [extraPassword, setExtraPassword] = useState('');
  const [confirmExtraPassword, setConfirmExtraPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [showConfirmExtra, setShowConfirmExtra] = useState(false);

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    setError('');

    if (pin.length < 6 || pin.length > 30) {
      setError('A Senha Mestre deve ter entre 6 e 30 caracteres.');
      return;
    }
    if (pin !== confirmPin) {
      setError('As senhas mestras não coincidem.');
      return;
    }

    if (mode === 'custom_extra') {
      if (!extraPassword || extraPassword.trim().length < 4) {
        setError('A Senha Extra deve ter no mínimo 4 caracteres.');
        return;
      }
      if (extraPassword.length > 15) {
        setError('A Senha Extra deve ter no máximo 15 caracteres.');
        return;
      }
      if (extraPassword === pin) {
        setError('A Senha Extra deve ser diferente da Senha Mestre para garantir segurança real.');
        return;
      }
      if (extraPassword !== confirmExtraPassword) {
        setError('As senhas extras não coincidem.');
        return;
      }
    }

    setLoading(true);
    try {
      await setupVault(pin, mode === 'custom_extra' ? extraPassword.trim() : null, mode);
    } catch (err: any) {
      setError(err?.message || 'Falha ao configurar o cofre. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6 my-auto"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
            Configuração do Cofre
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm px-2 leading-relaxed">
            Defina sua credencial mestre e escolha o modo de proteção por criptografia.
          </p>
        </div>

        <div className="p-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <p className="text-[11px] text-zinc-300 leading-tight">
            Guarde suas senhas em um local seguro. Se você as esquecer, não será possível recuperar seus arquivos criptografados.
          </p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-6"
        >
          {/* Seção 1: Senha Mestre */}
          <div className="space-y-3 bg-zinc-900/40 p-4 border border-white/5 rounded-2xl">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              1. Senha Mestre do Cofre
            </h3>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  name="setup-pin-1"
                  style={{ WebkitTextSecurity: showPin ? 'none' : 'disc' } as React.CSSProperties}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-center text-lg font-mono focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-600 placeholder:text-sm"
                  placeholder="Senha Mestre (min 6 caracteres)"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2"
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  name="setup-pin-2"
                  style={{ WebkitTextSecurity: showConfirmPin ? 'none' : 'disc' } as React.CSSProperties}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  disabled={loading}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-center text-lg font-mono focus:outline-none focus:border-white/30 text-white placeholder:text-zinc-600 placeholder:text-sm"
                  placeholder="Repita a Senha Mestre"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2"
                >
                  {showConfirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Seção 2: Modo de Criptografia */}
          <div className="space-y-3 bg-zinc-900/40 p-4 border border-white/5 rounded-2xl">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              2. Modo de Proteção de Criptografia
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Standard */}
              <button
                type="button"
                onClick={() => setMode('standard')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  mode === 'standard'
                    ? 'bg-white/10 border-white text-white shadow-lg'
                    : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                <ShieldCheck size={20} className={mode === 'standard' ? 'text-emerald-400 shrink-0 mt-0.5' : 'shrink-0 mt-0.5 text-zinc-500'} />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Modo Padrão (Normal)</span>
                    {mode === 'standard' && <CheckCircle2 size={16} className="text-white shrink-0" />}
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    Criptografia automática usando apenas a Senha Mestre. Acesso direto ao cofre sem exigir senha secundária.
                  </p>
                </div>
              </button>

              {/* Option 2: Extra Password */}
              <button
                type="button"
                onClick={() => setMode('custom_extra')}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                  mode === 'custom_extra'
                    ? 'bg-white/10 border-white text-white shadow-lg'
                    : 'bg-zinc-950/60 border-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                <Lock size={20} className={mode === 'custom_extra' ? 'text-teal-400 shrink-0 mt-0.5' : 'shrink-0 mt-0.5 text-zinc-500'} />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Modo Proteção Dupla (Com Senha Extra)</span>
                    {mode === 'custom_extra' && <CheckCircle2 size={16} className="text-white shrink-0" />}
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    Exige uma Senha Extra dedicada para fotos/mídias ocultas e ações de máxima segurança.
                  </p>
                </div>
              </button>
            </div>

            {/* Fields when Mode 2 is selected */}
            {mode === 'custom_extra' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-2"
              >
                <div className="relative">
                  <input
                    type="text"
                    name="setup-extra-1"
                    style={{ WebkitTextSecurity: showExtra ? 'none' : 'disc' } as React.CSSProperties}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    maxLength={15}
                    value={extraPassword}
                    onChange={(e) => setExtraPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-zinc-950 border border-teal-500/30 focus:border-teal-400 rounded-xl py-2.5 px-4 text-center text-base font-mono focus:outline-none text-white placeholder:text-zinc-600 placeholder:text-xs"
                    placeholder="Senha Extra de Segurança (min 4, max 15)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowExtra(!showExtra)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2"
                  >
                    {showExtra ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    name="setup-extra-2"
                    style={{ WebkitTextSecurity: showConfirmExtra ? 'none' : 'disc' } as React.CSSProperties}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    maxLength={15}
                    value={confirmExtraPassword}
                    onChange={(e) => setConfirmExtraPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-zinc-950 border border-teal-500/30 focus:border-teal-400 rounded-xl py-2.5 px-4 text-center text-base font-mono focus:outline-none text-white placeholder:text-zinc-600 placeholder:text-xs"
                    placeholder="Repita a Senha Extra"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmExtra(!showConfirmExtra)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-2"
                  >
                    {showConfirmExtra ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 px-3 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm cursor-pointer shadow-lg hover:bg-zinc-200"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                'Finalizar e Criar Cofre'
              )}
            </button>
            
            <button
              type="button"
              onClick={logOut}
              className="w-full text-zinc-400 hover:text-white text-xs font-semibold transition-colors py-2.5 rounded-xl hover:bg-zinc-900 cursor-pointer"
            >
              Cancelar e Sair
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

