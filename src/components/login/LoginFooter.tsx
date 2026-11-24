import React from 'react';

interface LoginFooterProps {
  onOpenTerms: () => void;
}

/**
 * Rodapé com links de termos de uso e política de privacidade
 */
export const LoginFooter: React.FC<LoginFooterProps> = ({ onOpenTerms }) => {
  return (
    <div className="pt-2 border-t border-white/5">
      <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
        Ao continuar, você concorda com nossos{' '}
        <button 
          type="button"
          onClick={onOpenTerms} 
          className="text-zinc-300 hover:text-white hover:underline transition-colors font-medium cursor-pointer"
        >
          Termos e Privacidade
        </button>
      </p>
    </div>
  );
};

export const LoginDivider: React.FC = () => {
  return (
    <div className="relative flex items-center justify-center py-1">
      <div className="w-full border-t border-white/10" />
      <span className="absolute bg-zinc-950 px-2.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
        ou
      </span>
    </div>
  );
};
