import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useVaultUnlockState } from "../hooks/useVaultUnlockState";
import { VaultUnlockForm } from "./vaultUnlock/VaultUnlockForm";
import { VaultUnlockCaptcha } from "./vaultUnlock/VaultUnlockCaptcha";

export default function VaultUnlock() {
  const {
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
    showCaptcha,
    setShowCaptcha,
    captchaVerified,
    setCaptchaVerified,
    recaptchaToken,
    setRecaptchaToken,
    verifyCaptchaOnBackend
  } = useVaultUnlockState();

  const [turnstileKey, setTurnstileKey] = useState(0);
  const [captchaMsg, setCaptchaMsg] = useState("");
  const [captchaStatus, setCaptchaStatus] = useState<"idle" | "error" | "success" | "verifying">("idle");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input") || target.closest("button") || target.closest(".turnstile") || target.closest("[role='dialog']")) {
      return;
    }
    inputRef.current?.blur();
  };

  useEffect(() => {
    if (showCaptcha) {
      setCaptchaMsg("Por favor, complete o desafio acima.");
      setCaptchaStatus("idle");
      setTurnstileKey(prev => prev + 1);
    }
  }, [showCaptcha]);

  useEffect(() => {
    if (captchaVerified && showCaptcha) {
      setCaptchaStatus("success");
      setCaptchaMsg("Perfeito! Verificação concluída com sucesso.");
      
      const timer = setTimeout(() => {
        setShowCaptcha(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [captchaVerified, showCaptcha, setShowCaptcha]);

  const handleRecaptchaChange = async (token: string | null) => {
    if (!token) {
      setCaptchaStatus("idle");
      setCaptchaMsg("Por favor, complete o desafio acima.");
      return;
    }
    setCaptchaStatus("verifying");
    setCaptchaMsg("Validando verificação humana no servidor...");
    const success = await verifyCaptchaOnBackend(token);
    if (success) {
      setCaptchaStatus("success");
      setCaptchaMsg("Perfeito! Verificação concluída com sucesso.");
      setTimeout(() => {
        setShowCaptcha(false);
      }, 1200);
    } else {
      setCaptchaStatus("error");
      setCaptchaMsg("Falha na validação de segurança. Por favor, tente novamente.");
      setTurnstileKey(prev => prev + 1);
    }
  };

  return (
    <div 
      onClick={handleBackgroundClick}
      className="relative min-h-[100dvh] bg-[#121214] flex flex-col items-center justify-center p-4 sm:p-8 text-zinc-100 overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-sm space-y-6 relative z-10 transition-transform duration-300 ${isFocused ? "max-sm:-translate-y-28" : ""}`}
      >
        <div className="text-center space-y-1.5 pb-2">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Cofre Criptografado
          </h2>
          <p className="text-zinc-400 text-xs px-6 leading-relaxed max-w-xs mx-auto">
            Insira sua credencial para acessar seus arquivos protegidos.
          </p>
        </div>

        <VaultUnlockForm
          pin={pin}
          setPin={setPin}
          error={error}
          loading={loading}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          lockedUntil={lockedUntil}
          remainingTime={remainingTime}
          failedAttempts={failedAttempts}
          handleSubmit={handleSubmit}
          logOut={logOut}
          inputRef={inputRef}
          setIsFocused={setIsFocused}
        />
      </motion.div>

      <VaultUnlockCaptcha
        showCaptcha={showCaptcha}
        setShowCaptcha={setShowCaptcha}
        captchaVerified={captchaVerified}
        turnstileKey={turnstileKey}
        handleRecaptchaChange={handleRecaptchaChange}
        captchaStatus={captchaStatus}
        captchaMsg={captchaMsg}
      />
    </div>
  );
}
