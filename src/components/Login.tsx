import React from 'react';
import { Loader2, Mail, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import TermsModal from './TermsModal';
import { useLoginLogic } from '../hooks/useLoginLogic';

export default function Login() {
  const l = useLoginLogic();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 py-8 sm:p-8 text-zinc-100 overflow-y-auto w-full" id="login-container">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6 sm:space-y-8 my-auto animate-fadeIn"
      >
        <div className="text-center space-y-3">
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 drop-shadow-sm">
              Cloud Gallery
            </h1>
            <p className="text-zinc-400/90 text-sm px-2 sm:px-6 leading-relaxed font-medium max-w-[280px] sm:max-w-xs">
              Armazenamento em nuvem com criptografia de ponta a ponta.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {l.error && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg whitespace-pre-line px-3"
            >
              {l.error}
            </motion.p>
          )}

          {l.message && (
            <motion.p 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-zinc-200 text-xs text-center font-medium bg-white/10 py-2 rounded-lg whitespace-pre-line px-3"
            >
              {l.message}
            </motion.p>
          )}
          
          {!l.isEmailLogin ? (
            <div className="space-y-3 animate-fadeIn">
              <button
                onClick={l.handleGoogleSignIn}
                disabled={l.loading}
                className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-200/50 font-semibold py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] text-sm sm:text-base cursor-pointer"
              >
                {l.loading ? (
                  <div className="relative">
                    <motion.div
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 blur-md bg-black/20 rounded-full"
                    />
                    <Loader2 className="animate-spin relative z-10" size={20} />
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuar com o Google
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  l.setIsEmailLogin(true);
                  l.setError('');
                  l.setMessage('');
                }}
                disabled={l.loading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 font-semibold py-3 sm:py-3.5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] text-sm sm:text-base cursor-pointer"
              >
                <Mail size={18} />
                Entrar com e-mail e senha
              </button>
            </div>
          ) : (
            <form onSubmit={l.handleSubmit} className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="seu-email@dominio.com"
                    value={l.email}
                    onChange={(e) => l.setEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-400">Senha</label>
                  <button
                    type="button"
                    onClick={l.handleResetPassword}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="text"
                    style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                    required
                    placeholder="Sua senha de 6 dígitos"
                    value={l.password}
                    onChange={(e) => l.setPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/30 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    l.setIsEmailLogin(false);
                    l.setError('');
                    l.setMessage('');
                  }}
                  className="flex-1 py-2.5 sm:py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 font-semibold rounded-xl transition-all text-sm cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={l.loading}
                  className="flex-1 py-2.5 sm:py-3 px-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {l.loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    "Entrar"
                  )}
                </button>
              </div>
            </form>
          )}

          <p className="text-xs text-zinc-500 text-center px-4 leading-relaxed pt-2">
            Ao utilizar o aplicativo, você concorda com nossos{' '}
            <button 
              onClick={() => l.setShowTerms(true)} 
              className="text-white hover:underline transition-colors font-medium cursor-pointer"
            >
              Termos e Privacidade
            </button>
          </p>
        </div>
      </motion.div>

      <TermsModal isOpen={l.showTerms} onClose={() => l.setShowTerms(false)} />
    </div>
  );
}
