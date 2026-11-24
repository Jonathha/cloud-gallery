import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { LoginEmailFields } from './LoginEmailFields';

interface LoginEmailFormProps {
  l: any;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  onFormSubmit: (e: React.FormEvent) => void;
  isEmailError: boolean;
  isPasswordError: boolean;
}

export const LoginEmailForm: React.FC<LoginEmailFormProps> = ({
  l, showPassword, setShowPassword, emailInputRef, passwordInputRef,
  onFormSubmit, isEmailError, isPasswordError
}) => {
  return (
    <motion.form 
      key="email-form-view"
      onSubmit={onFormSubmit}
      noValidate
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-4 pt-1"
    >
      <LoginEmailFields
        email={l.email} setEmail={l.setEmail}
        password={l.password} setPassword={l.setPassword}
        showPassword={showPassword} setShowPassword={setShowPassword}
        isEmailError={isEmailError} isPasswordError={isPasswordError}
        emailInputRef={emailInputRef} passwordInputRef={passwordInputRef}
        onResetPassword={l.handleResetPassword}
        onErrorClear={() => { if (l.error) l.setError(''); }}
      />
      <div className="flex gap-2.5 pt-2">
        <button type="button" onClick={() => { l.setIsEmailLogin(false); l.setError(''); l.setMessage(''); }} className="flex-1 py-2.5 sm:py-3 px-3 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white font-medium rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-1.5 active:scale-[0.985] cursor-pointer">
          <ArrowLeft size={15} /><span>Voltar</span>
        </button>
        <button type="submit" disabled={l.loading} className="flex-1 py-2.5 sm:py-3 px-4 bg-white hover:bg-zinc-100 active:bg-zinc-200 text-black font-semibold rounded-xl transition-all duration-200 text-sm flex items-center justify-center gap-2 active:scale-[0.985] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
          {l.loading ? <Loader2 className="animate-spin text-black" size={16} /> : 'Entrar'}
        </button>
      </div>
    </motion.form>
  );
};
