import React, { useState, useEffect, useRef, RefObject } from "react";
import { Eye, EyeOff, Loader2, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

interface VaultUnlockFormProps {
pin: string;
setPin: (p: string) => void;
error: string | null;
setError?: (e: string) => void;
loading: boolean;
showPassword: boolean;
setShowPassword: (s: boolean) => void;
lockedUntil: number | null;
remainingTime: string;
failedAttempts: number;
handleSubmit: () => void;
logOut: () => void;
inputRef: RefObject<HTMLInputElement>;
isFocused?: boolean;
setIsFocused: (f: boolean) => void;
formCardRef?: RefObject<HTMLDivElement>;
isQuickAccess?: boolean;
handleQuickUnlock?: () => void;
}

export function VaultUnlockForm({
pin,
setPin,
error,
setError,
loading,
showPassword,
setShowPassword,
lockedUntil,
remainingTime,
failedAttempts,
handleSubmit,
logOut,
inputRef,
isFocused,
setIsFocused,
formCardRef,
isQuickAccess,
handleQuickUnlock
}: VaultUnlockFormProps) {
const [progress, setProgress] = useState(0);
const [showDiagnostics, setShowDiagnostics] = useState(false);
const [isInputReady, setIsInputReady] = useState(false);
const fieldKey = React.useMemo(() => `vk_${Math.random().toString(36).slice(2, 10)}`, []);
const { user } = useAuth();
const lockoutStartRef = useRef<{ lockedUntil: number; duration: number } | null>(null);

const providerId = user?.providerData?.[0]?.providerId || "";
const isGoogle = providerId === "google.com";

useEffect(() => {
if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
inputRef.current?.focus();
}
}, [inputRef]);

useEffect(() => {
if (error && !lockedUntil && !loading) {
inputRef.current?.focus();
inputRef.current?.select();
}
}, [error, lockedUntil, loading, inputRef]);

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
  <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl backdrop-blur-xl relative overflow-hidden touch-auto">
    <div className="relative">
      <div
        role="presentation"
        className="space-y-5 relative z-10"
      >
        <div className="space-y-3">
          <label htmlFor={fieldKey} className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-[0.2em] text-center">
            Credencial de Acesso
          </label>
          <div className="relative group">
            <input
              type="text"
              name={fieldKey}
              id={fieldKey}
              ref={inputRef}
              readOnly={!isInputReady}
              onPointerDown={() => setIsInputReady(true)}
              onTouchStart={() => setIsInputReady(true)}
              onMouseDown={() => setIsInputReady(true)}
              onFocus={() => {
                setIsInputReady(true);
                setIsFocused(true);
              }}
              onBlur={() => {
                setIsFocused(false);
                setIsInputReady(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!loading && !lockedUntil && pin) {
                    inputRef.current?.blur();
                    handleSubmit();
                  }
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
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error && setError) {
                  setError("");
                }
              }}
              disabled={loading || !!lockedUntil}
              maxLength={30}
              className="w-full bg-black/60 border border-white/10 rounded-xl py-3.5 px-12 text-center text-xl tracking-[0.2em] font-mono focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-white/15 focus:shadow-[0_0_20px_rgba(255,255,255,0.06)] transition-all duration-200 placeholder:text-zinc-600 placeholder:tracking-normal text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-inner"
              placeholder={lockedUntil ? "BLOQUEADO" : "••••"}
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!!lockedUntil}
              data-no-tooltip="true"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              <span className="inline-flex transition-transform duration-150 ease-out active:scale-90">
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </span>
            </button>
          </div>
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                key="vault-unlock-error"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ type: "spring", stiffness: 450, damping: 36 }}
                className="overflow-hidden"
              >
                <p className="text-red-400 text-xs text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl px-3 leading-relaxed shadow-sm backdrop-blur-sm">
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-3 pt-1">
          <div ref={formCardRef}>
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
                  <line x1="10" x2="14" y1="2" y2="2" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" x2="12" y1="2" y2="6" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="12" cy="14" r="8" stroke="currentColor" strokeWidth="1.8" fill="none" opacity="0.6" />
                  <circle cx="12" cy="14" r="5" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.8" fill="none" />
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
                  <g transform={`rotate(${progress * 360} 12 14)`}>
                    <line x1="12" y1="14" x2="12" y2="9.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
                  </g>
                  <circle cx="12" cy="14" r="1.2" fill="#ffffff" stroke="none" />
                </svg>
                <span>Aguarde {remainingTime}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  inputRef.current?.blur();
                  handleSubmit();
                }}
                disabled={loading || !pin}
                className="w-full bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-semibold py-3.5 rounded-xl transition-colors duration-150 flex items-center justify-center gap-1.5 active:scale-[0.98] text-sm disabled:opacity-40 disabled:bg-zinc-800/50 disabled:text-zinc-500 disabled:cursor-not-allowed border border-transparent disabled:border-white/5 cursor-pointer shadow-sm"
              >
                {loading ? (
                  <Loader2 className="animate-spin text-black" size={18} />
                ) : (
                  <span className="flex items-center gap-1.5 justify-center">
                    Desbloquear
                    <ChevronRight size={16} />
                  </span>
                )}
              </button>
            )}
          </div>

          {isQuickAccess && handleQuickUnlock && !lockedUntil && (
            <button
              type="button"
              onClick={handleQuickUnlock}
              disabled={loading}
              className="w-full bg-zinc-800/60 hover:bg-zinc-800 active:bg-zinc-700/80 disabled:opacity-40 text-zinc-300 hover:text-white font-medium py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-xs cursor-pointer border border-white/5 active:scale-[0.98]"
            >
              <Zap size={14} className="text-zinc-400" />
              <span>Entrar com Acesso Rápido</span>
            </button>
          )}
        </div>
      </div>
    </div>

    <button
      type="button"
      onClick={logOut}
      className="w-full text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors duration-200 py-2 rounded-lg text-center cursor-pointer"
    >
      Sair da conta
    </button>
  </div>
);
}
