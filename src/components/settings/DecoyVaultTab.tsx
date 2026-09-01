import React, { useState, useEffect } from 'react';
import { EyeOff, Key, ShieldAlert, Check, Trash2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface DecoyVaultTabProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function DecoyVaultTab({ showToast }: DecoyVaultTabProps) {
  const [fakePin, setFakePin] = useState<string>('');
  const [inputPin, setInputPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('fake_vault_pin') || '';
    setFakePin(saved);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPin || inputPin.trim() === '') {
      showToast('Por favor, insira um PIN.', 'error');
      return;
    }

    if (inputPin.length < 6 || inputPin.length > 30) {
      showToast('O PIN deve ter entre 6 e 30 caracteres.', 'error');
      return;
    }

    if (inputPin !== confirmPin) {
      showToast('Os PINs digitados não coincidem.', 'error');
      return;
    }

    // Check if decoy PIN is same as the user's main PIN/password
    // We don't have the main password here, but we can warn the user.
    localStorage.setItem('fake_vault_pin', inputPin);
    setFakePin(inputPin);
    setInputPin('');
    setConfirmPin('');
    showToast('Cofre Falso configurado com sucesso!');
  };

  const handleRemove = () => {
    localStorage.removeItem('fake_vault_pin');
    setFakePin('');
    setInputPin('');
    setConfirmPin('');
    showToast('Cofre Falso desativado.');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-white mb-2">Cofre Falso Decoy</h3>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          O Cofre Falso permite configurar uma senha de acesso secundária. Ao digitá-la na tela inicial, o aplicativo abrirá uma galeria local totalmente vazia. Ideal para proteger sua privacidade.
        </p>

        {fakePin ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 flex items-start gap-3">
              <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-semibold text-white">Status: Ativo</p>
                <p className="text-xs text-zinc-400 mt-1">
                  O Cofre Falso está configurado e pronto para uso. Digite o PIN falso na tela de início para abrir o cofre decoy.
                </p>
              </div>
            </div>

            <button
              onClick={handleRemove}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm font-semibold cursor-pointer"
            >
              <Trash2 size={16} />
              Desativar Cofre Falso
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex items-start gap-3">
              <ShieldAlert className="text-zinc-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-zinc-400 leading-normal">
                Tudo é processado localmente no seu dispositivo. Escolha um PIN diferente do seu PIN principal de segurança.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Novo PIN de Acesso Falso</label>
                <input
                  type="password"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">Confirmar PIN Falso</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repita o PIN falso"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors"
                  maxLength={30}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white text-black hover:bg-zinc-200 transition-all text-sm font-bold active:scale-[0.98] cursor-pointer"
            >
              <Check size={16} />
              Configurar Cofre Falso
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
