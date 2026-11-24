import React from "react";
import { QuickAccessPinInput } from "./QuickAccessPinInput";
import { QuickAccessSubmitButton } from "./QuickAccessSubmitButton";

interface QuickAccessFormViewProps {
  pin: string;
  setPin: (val: string) => void;
  showPin: boolean;
  setShowPin: (val: boolean) => void;
  loading: boolean;
  error: string | null;
  setError: (val: string | null) => void;
  handleEnable: (e: React.FormEvent) => void;
}

export function QuickAccessFormView({
  pin,
  setPin,
  showPin,
  setShowPin,
  loading,
  error,
  setError,
  handleEnable
}: QuickAccessFormViewProps) {
  return (
    <section className="p-4 sm:p-5 bg-zinc-900/40 border border-white/10 rounded-2xl space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-white">Habilitar Acesso Rápido</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Insira a sua senha do cofre uma única vez para salvar a autorização neste aparelho.
        </p>
      </div>

      <form onSubmit={handleEnable} className="space-y-3" noValidate>
        <QuickAccessPinInput
          pin={pin}
          setPin={setPin}
          showPin={showPin}
          setShowPin={setShowPin}
          loading={loading}
          hasError={!!error}
          onClearError={() => error && setError(null)}
        />
        <QuickAccessSubmitButton loading={loading} pin={pin} error={error} />
      </form>
    </section>
  );
}

export default QuickAccessFormView;
