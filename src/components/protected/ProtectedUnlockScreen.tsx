import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface ProtectedUnlockScreenProps {
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  passwordError: string;
  setPasswordError: (val: string) => void;
  onUnlockSubmit: (e?: React.FormEvent) => void;
  isLoading?: boolean;
}

export default function ProtectedUnlockScreen({
  passwordInput,
  setPasswordInput,
  passwordError,
  setPasswordError,
  onUnlockSubmit,
  isLoading,
}: ProtectedUnlockScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isInputReady, setIsInputReady] = useState(false);
  const fieldKey = React.useMemo(() => `pk_${Math.random().toString(36).slice(2, 10)}`, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 h-full bg-[#050505]">
      <div className="max-w-md w-full bg-gradient-to-b from-zinc-900 to-[#121212] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 text-center space-y-8 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
        {/* Subtle elegant white/glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-white/5 blur-[50px] rounded-full pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
            Acesso Restrito
          </h2>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Área de alta segurança. Insira a credencial secundária para continuar.
          </p>
        </div>

        <div
          role="presentation"
          className="space-y-5 w-full relative z-10"
        >
          <div className="relative">
            <input
              type="text"
              name={fieldKey}
              id={fieldKey}
              readOnly={!isInputReady}
              onPointerDown={() => setIsInputReady(true)}
              onTouchStart={() => setIsInputReady(true)}
              onMouseDown={() => setIsInputReady(true)}
              onFocus={() => setIsInputReady(true)}
              onBlur={() => setIsInputReady(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onUnlockSubmit();
                }
              }}
              style={{ WebkitTextSecurity: showPassword ? "none" : "disc" } as React.CSSProperties}
              autoComplete="off"
              aria-autocomplete="none"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-protonpass-ignore="true"
              data-form-type="other"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              placeholder="Credencial de acesso"
              className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 sm:py-5 px-14 text-white text-center text-lg sm:text-xl placeholder:text-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all font-mono tracking-wider shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <span className="inline-flex transition-transform duration-150 ease-out active:scale-90">
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </span>
            </button>
          </div>

          {passwordError && (
            <p className="text-red-400 text-xs sm:text-sm font-semibold bg-red-500/10 py-3 px-4 rounded-xl border border-red-500/10">
              {passwordError}
            </p>
          )}

          <button
            type="button"
            onClick={() => onUnlockSubmit()}
            disabled={isLoading}
            className="w-full py-4 sm:py-5 bg-white hover:bg-zinc-100 disabled:bg-zinc-300 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-bold text-base rounded-2xl shadow-xl transition-all active:scale-[0.98] hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Desbloquear Cofre"}
          </button>
        </div>
      </div>
    </div>
  );
}
