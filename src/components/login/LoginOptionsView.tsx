import React from 'react';
import { Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleLoginButton } from './GoogleLoginButton';
import { LoginDivider } from './LoginFooter';

interface LoginOptionsViewProps {
  loading: boolean;
  onGoogleSignIn: () => void;
  onSelectEmailLogin: () => void;
}

export const LoginOptionsView: React.FC<LoginOptionsViewProps> = ({
  loading,
  onGoogleSignIn,
  onSelectEmailLogin,
}) => {
  return (
    <motion.div 
      key="options-view"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-3 pt-1"
    >
      <GoogleLoginButton loading={loading} onGoogleSignIn={onGoogleSignIn} />
      <LoginDivider />
      <button
        id="email-signin-btn"
        onClick={onSelectEmailLogin}
        disabled={loading}
        className="w-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 font-medium py-3 sm:py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.985] text-sm cursor-pointer disabled:opacity-60"
      >
        <Mail size={17} className="text-zinc-400" />
        <span>Entrar com e-mail e senha</span>
      </button>
    </motion.div>
  );
};
