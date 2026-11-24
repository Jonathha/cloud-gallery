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
    isQuickAccess,
    handleQuickUnlock,
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
  const [translateY, setTranslateY] = useState(0);
  const translateYRef = useRef(0);
  translateYRef.current = translateY;
  const containerRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Maior altura da página vista sem teclado; serve para saber se o teclado está aberto
  const baseViewportRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    let frameId: number | null = null;
    let releaseTimerId: ReturnType<typeof setTimeout> | null = null;
    const settleTimers: ReturnType<typeof setTimeout>[] = [];

    const scheduleUpdate = (callback: () => void) => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        frameId = null;
        callback();
      });
    };

    const updatePosition = () => {
      const targetEl = formCardRef.current;
      const inputEl = inputRef.current;

      if (!targetEl || !inputEl) return;

      const vv = window.visualViewport;
      // offsetTop cobre navegadores que só empurram a área visível em vez de redimensionar a página
      const visibleHeight = vv ? vv.offsetTop + vv.height : window.innerHeight;

      /*
       * formCardRef points to the interactive unlock card.
       * Its bottom is used as the boundary because this is the
       * smallest existing container containing the credential field,
       * error state and unlock action.
       *
       * getBoundingClientRect() already includes Motion's current
       * translation, so currentShift is added back to recover the
       * unshifted coordinates before calculating the required move.
       */
      const rect = targetEl.getBoundingClientRect();
      // Translação realmente aplicada agora (a mola pode estar no meio da animação);
      // translateYRef guarda só o alvo e gerava erro de cálculo conforme o momento da medição.
      let currentShift = translateYRef.current;
      const container = containerRef.current;
      if (container) {
        const t = getComputedStyle(container).transform;
        if (t && t !== "none") {
          try {
            currentShift = -new DOMMatrixReadOnly(t).m42;
          } catch {}
        }
      }

      const unshiftedBottom = rect.bottom + currentShift;
      const unshiftedTop = rect.top + currentShift;

      const safetyMargin = 16;
      const visibleBottom = visibleHeight - safetyMargin;

      // Teclado aberto = área visível bem menor que a maior altura vista sem teclado
      const base = baseViewportRef.current;
      if (base.w !== window.innerWidth) {
        base.w = window.innerWidth;
        base.h = window.innerHeight;
      } else {
        base.h = Math.max(base.h, window.innerHeight);
      }
      const keyboardOpen = visibleHeight < base.h - 150;

      /*
       * Com teclado aberto, o botão Desbloquear sempre termina logo acima dele, em qualquer
       * navegador: onde a página já é redimensionada pelo teclado (resizes-content) o card
       * fica centralizado com folga e desce até o botão; onde não é, sobe o necessário.
       * Sem teclado, mantém o comportamento anterior (só sobe o mínimo, nunca desce).
       */
      const requiredShift = keyboardOpen
        ? unshiftedBottom - visibleBottom
        : Math.max(0, unshiftedBottom - visibleBottom);

      /*
       * Never move the card above the top safety boundary.
       */
      const maxAllowedShift = Math.max(
        0,
        unshiftedTop - safetyMargin
      );

      const finalShift = Math.min(
        requiredShift,
        maxAllowedShift
      );

      const roundedShift = Math.round(finalShift);

      if (roundedShift !== translateYRef.current) {
        setTranslateY(roundedShift);
      }
    };

    const releasePosition = () => {
      /*
       * Do not release the translation immediately on blur.
       * Mobile browsers can still be animating the keyboard/viewport.
       * Waiting for the next rendering frame allows the current layout
       * transition to settle before Motion receives the zero target.
       */
      scheduleUpdate(() => {
        setTranslateY(0);
      });
    };

    if (isFocused) {
      /*
       * Initial calculation after focus.
       */
      scheduleUpdate(updatePosition);
      // Remedição com o teclado já aberto: alguns navegadores avisam tarde ou não avisam
      settleTimers.push(
        setTimeout(() => scheduleUpdate(updatePosition), 150),
        setTimeout(() => scheduleUpdate(updatePosition), 350)
      );

      const vv = window.visualViewport;

      const handleViewportChange = () => {
        /*
         * The keyboard can generate several resize/scroll events during
         * its animation. requestAnimationFrame coalesces those events
         * so Motion receives at most one new position per rendered frame.
         */
        scheduleUpdate(updatePosition);
      };

      if (vv) {
        vv.addEventListener("resize", handleViewportChange);
        vv.addEventListener("scroll", handleViewportChange);
      }

      window.addEventListener("resize", handleViewportChange);

      return () => {
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
        }
        settleTimers.forEach(clearTimeout);

        if (vv) {
          vv.removeEventListener("resize", handleViewportChange);
          vv.removeEventListener("scroll", handleViewportChange);
        }

        window.removeEventListener("resize", handleViewportChange);
      };
    }

    /*
     * Focus was lost. Do not snap the card back synchronously while the
     * mobile keyboard is still closing.
     */
    releaseTimerId = setTimeout(() => {
      releasePosition();
    }, 50);

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      if (releaseTimerId !== null) {
        clearTimeout(releaseTimerId);
      }
    };
  }, [isFocused]);

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("input") || target.closest("button") || target.closest(".turnstile") || target.closest("[role='dialog']")) {
      return;
    }
    inputRef.current?.blur();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest("input") && !target.closest("button")) {
      e.preventDefault();
    }
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
      onTouchMove={handleTouchMove}
      className="fixed inset-0 bg-[#121214] flex flex-col items-center justify-center p-4 sm:p-8 text-zinc-100 overflow-hidden overscroll-none touch-none select-none"
    >
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: -translateY }}
        transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.8 }}
        className="w-full max-w-sm space-y-6 relative z-10"
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
          setError={setError}
          loading={loading}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          lockedUntil={lockedUntil}
          remainingTime={remainingTime}
          failedAttempts={failedAttempts}
          handleSubmit={handleSubmit}
          logOut={logOut}
          inputRef={inputRef}
          isFocused={isFocused}
          setIsFocused={setIsFocused}
          formCardRef={formCardRef}
          isQuickAccess={isQuickAccess}
          handleQuickUnlock={handleQuickUnlock}
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