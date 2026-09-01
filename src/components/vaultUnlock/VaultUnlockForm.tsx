import React, { useState, useEffect, useRef, RefObject } from "react";
import { Eye, EyeOff, Loader2, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface VaultUnlockFormProps {
  pin: string;
  setPin: (p: string) => void;
  error: string | null;
  loading: boolean;
  showPassword: boolean;
  setShowPassword: (s: boolean) => void;
  lockedUntil: number | null;
  remainingTime: string;
  failedAttempts: number;
  handleSubmit: () => void;
  logOut: () => void;
  inputRef: RefObject<HTMLInputElement>;
  setIsFocused: (f: boolean) => void;
}

export function VaultUnlockForm({
  pin,
  setPin,
  error,
  loading,
  showPassword,
  setShowPassword,
  lockedUntil,
  remainingTime,
  failedAttempts,
  handleSubmit,
  logOut,
  inputRef,
  setIsFocused
}: VaultUnlockFormProps) {
  const [progress, setProgress] = useState(0);
  const lockoutStartRef = useRef<{ lockedUntil: number; duration: number } | null>(null);

  useEffect(() => {
    if (!lockedUntil) {
      lockoutStartRef.current = null;
      setProgress(0);
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, lockedUntil - now);

    if (!lockoutStartRef.current || lockoutStartRef.current.lockedUntil !== lockedUntil) {
      let estimatedTotal = 30000;
      if (failedAttempts === 3) estimatedTotal = 30000;
      else if (failedAttempts === 4) estimatedTotal = 60000;
      else if (failedAttempts === 5) estimatedTotal = 120000;
      else if (failedAttempts === 6) estimatedTotal = 300000;
      else if (failedAttempts >= 7) estimatedTotal = 86400000;

      const totalDuration = Math.max(remaining, estimatedTotal);
      lockoutStartRef.current = { lockedUntil, duration: totalDuration };
    }

    const updateProgress = () => {
      const currentNow = Date.now();
      if (!lockoutStartRef.current || currentNow >= lockedUntil) {
        setProgress(1);
        return;
      }
      const currentRemaining = Math.max(0, lockedUntil - currentNow);
      const elapsed = lockoutStartRef.current.duration - currentRemaining;
      const p = Math.min(1, Math.max(0, elapsed / lockoutStartRef.current.duration));
      setProgress(p);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, [lockedUntil, failedAttempts]);

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-5 relative z-10"
      >
        <div className="space-y-3">
          <label htmlFor="secure-input-field" className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.2em] text-center">
            Credencial de Acesso
          </label>
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              name="secure-input-field"
              id="secure-input-field"
              ref={inputRef}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={{ WebkitTextSecurity: showPassword ? "none" : "disc" } as React.CSSProperties}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading || !!lockedUntil}
              maxLength={24}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 px-12 text-center text-xl tracking-[0.2em] font-mono focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-600/50 transition-all placeholder:text-zinc-600 placeholder:tracking-normal text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-inner"
              placeholder={
                lockedUntil 
                  ? "BLOQUEADO" 
                  : "••••"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!!lockedUntil}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl px-3 leading-relaxed"
            >
              {error}
            </motion.p>
          )}
        </div>

        <div className="space-y-3 pt-1">
          {lockedUntil ? (
            <button
              type="button"
              disabled={true}
              className="w-full bg-zinc-800/80 text-zinc-400 font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm cursor-not-allowed border border-white/5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                {/* Top stopwatch stem and button */}
                <line x1="10" x2="14" y1="2" y2="2" stroke="currentColor" strokeWidth="2" />
                <line x1="12" x2="12" y1="2" y2="6" stroke="currentColor" strokeWidth="1.5" />
                
                {/* Outer casing */}
                <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
                
                {/* Background track */}
                <circle cx="12" cy="14" r="5" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.8" fill="none" />
                
                {/* Trailing white progress sweep behind the needle */}
                <circle
                  cx="12"
                  cy="14"
                  r="5"
                  stroke="#ffffff"
                  strokeWidth="1.8"
                  strokeDasharray="31.42"
                  strokeDashoffset={31.42 * (1 - progress)}
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 12 14)"
                />
                
                {/* Moving needle hand inside clock */}
                <g transform={`rotate(${progress * 360} 12 14)`}>
                  <line
                    x1="12"
                    y1="14"
                    x2="12"
                    y2="9.5"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </g>
                
                {/* Center pivot */}
                <circle cx="12" cy="14" r="1.2" fill="#ffffff" stroke="none" />
              </svg>
              <span>Aguarde {remainingTime}</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800/50 disabled:text-zinc-500 text-black font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] text-sm disabled:cursor-not-allowed border border-transparent disabled:border-white/5 cursor-pointer shadow-md"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <span className="flex items-center gap-1.5 justify-center">
                  Desbloquear
                  <ChevronRight size={16} />
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={logOut}
            className="w-full text-zinc-400 hover:text-white text-xs font-medium transition-all py-2 rounded-lg text-center cursor-pointer"
          >
            Sair da conta
          </button>
        </div>
      </form>
    </div>
  );
}
