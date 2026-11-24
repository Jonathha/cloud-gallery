import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface QuickAccessPinInputProps {
  pin: string;
  setPin: (val: string) => void;
  showPin: boolean;
  setShowPin: (val: boolean) => void;
  loading: boolean;
  hasError?: boolean;
  onClearError: () => void;
}

export function QuickAccessPinInput({
  pin,
  setPin,
  showPin,
  setShowPin,
  loading,
  hasError,
  onClearError
}: QuickAccessPinInputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="quick-access-pin" className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
        Senha do Cofre
      </label>
      <div className="relative">
        <input
          id="quick-access-pin"
          name="vault-password"
          type={showPin ? "text" : "password"}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            onClearError();
          }}
          placeholder="Digite sua senha"
          disabled={loading}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "quick-access-error" : undefined}
          className={`w-full h-12 sm:h-11 bg-zinc-950/80 border rounded-xl pl-3.5 pr-12 text-base sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors disabled:opacity-60 ${
            hasError ? "border-red-500/40 focus:border-red-400/60" : "border-white/10 focus:border-zinc-400"
          }`}
        />
        {pin.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPin(!showPin)}
            aria-label={showPin ? "Ocultar senha" : "Ver senha"}
            aria-pressed={showPin}
            tabIndex={-1}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer touch-manipulation"
          >
            {showPin ? <Eye size={17} /> : <EyeOff size={17} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default QuickAccessPinInput;
