import React from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginEmailFieldsProps {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isEmailError: boolean;
  isPasswordError: boolean;
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  onResetPassword: () => void;
  onErrorClear: () => void;
}

export const LoginEmailFields: React.FC<LoginEmailFieldsProps> = ({
  email, setEmail, password, setPassword, showPassword, setShowPassword,
  isEmailError, isPasswordError, emailInputRef, passwordInputRef, onResetPassword, onErrorClear
}) => {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-300">E-mail</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500"><Mail size={16} /></span>
          <input ref={emailInputRef} id="login-email-input" type="email" autoComplete="email" placeholder="seu-email@dominio.com" value={email} onChange={(e) => { setEmail(e.target.value); onErrorClear(); }} className={`w-full bg-zinc-900/60 border rounded-xl pl-10 pr-4 py-2.5 sm:py-3 text-white placeholder-zinc-500 focus:outline-none transition-all duration-200 text-sm ${isEmailError ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/10'}`} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-300">Senha</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500"><Lock size={16} /></span>
          <input ref={passwordInputRef} id="login-password-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Sua senha de 6 dígitos" value={password} onChange={(e) => { setPassword(e.target.value); onErrorClear(); }} className={`w-full bg-zinc-900/60 border rounded-xl pl-10 pr-10 py-2.5 sm:py-3 text-white placeholder-zinc-500 focus:outline-none transition-all duration-200 text-sm ${isPasswordError ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' : 'border-white/10 focus:border-white/30 focus:ring-2 focus:ring-white/10'}`} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer" tabIndex={-1} aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}>
            <span className="inline-flex transition-transform duration-150 ease-out active:scale-90">{showPassword ? <Eye size={16} /> : <EyeOff size={16} />}</span>
          </button>
        </div>
        <div className="flex justify-end pt-1">
          <button type="button" onClick={onResetPassword} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-150 cursor-pointer">Esqueceu a senha?</button>
        </div>
      </div>
    </>
  );
};
