import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface VaultSetupActionsProps {
  error: string;
  loading: boolean;
  onCancel: () => void;
}

export const VaultSetupActions: React.FC<VaultSetupActionsProps> = ({ error, loading, onCancel }) => {
  return (
    <>
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
          className="w-full bg-white text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm cursor-pointer shadow-lg hover:bg-zinc-200 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            'Finalizar e Criar Cofre'
          )}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-zinc-400 hover:text-white text-xs font-semibold transition-colors py-2.5 rounded-xl hover:bg-zinc-900 cursor-pointer"
        >
          Cancelar e Sair
        </button>
      </div>
    </>
  );
};
