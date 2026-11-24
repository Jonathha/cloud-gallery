import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TermsModal from './TermsModal';
import { useLoginLogic } from '../hooks/useLoginLogic';
import { LoginHeader, LoginAmbientBackground } from './login/LoginHeader';
import { LoginAlerts } from './login/LoginAlerts';
import { LoginOptionsView } from './login/LoginOptionsView';
import { LoginEmailForm } from './login/LoginEmailForm';
import { LoginFooter } from './login/LoginFooter';

export default function Login() {
  const l = useLoginLogic();
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const isEmailError = Boolean(l.error && (l.error.toLowerCase().includes('e-mail') || l.error.toLowerCase().includes('email')));
  const isPasswordError = Boolean(l.error && l.error.toLowerCase().includes('senha'));

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await l.handleSubmit(e);
    if (!l.email.trim()) {
      emailInputRef.current?.focus();
    } else if (!l.password) {
      passwordInputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 overflow-x-hidden relative select-none" id="login-container">
      <LoginAmbientBackground />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-[360px] sm:max-w-[380px] relative z-10 space-y-6 sm:space-y-7">
        <LoginHeader />
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <LoginAlerts error={l.error} message={l.message} />
          <AnimatePresence mode="wait">
            {!l.isEmailLogin ? (
              <LoginOptionsView loading={l.loading} onGoogleSignIn={l.handleGoogleSignIn} onSelectEmailLogin={() => { l.setIsEmailLogin(true); l.setError(''); l.setMessage(''); }} />
            ) : (
              <LoginEmailForm l={l} showPassword={showPassword} setShowPassword={setShowPassword} emailInputRef={emailInputRef} passwordInputRef={passwordInputRef} onFormSubmit={handleFormSubmit} isEmailError={isEmailError} isPasswordError={isPasswordError} />
            )}
          </AnimatePresence>
          <LoginFooter onOpenTerms={() => l.setShowTerms(true)} />
        </div>
      </motion.div>
      <TermsModal isOpen={l.showTerms} onClose={() => l.setShowTerms(false)} />
    </div>
  );
}
