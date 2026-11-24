import React from "react";
import { Zap, Loader2, AlertCircle } from "lucide-react";

interface QuickAccessSubmitButtonProps {
  loading: boolean;
  pin: string;
  error: string | null;
}

export function QuickAccessSubmitButton({ loading, pin, error }: QuickAccessSubmitButtonProps) {
  return (
    <>
      {error && (
        <div
          id="quick-access-error"
          role="alert"
          className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-400 leading-relaxed"
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !pin}
        className="w-full h-12 sm:h-11 bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-semibold text-sm sm:text-xs rounded-xl transition-colors cursor-pointer touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Validando...</span>
          </>
        ) : (
          <>
            <Zap size={15} />
            <span>Ativar Acesso Rápido</span>
          </>
        )}
      </button>
    </>
  );
}

export default QuickAccessSubmitButton;
