import React, { useEffect, useRef } from "react";

interface TurnstileProps {
  sitekey: string;
  onChange: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
}

export default function Turnstile({ sitekey, onChange, theme = "dark" }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const scriptId = "cloudflare-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initializeTurnstile = () => {
      if (!containerRef.current || !(window as any).turnstile) return;

      if (widgetIdRef.current) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }

      try {
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
        widgetIdRef.current = (window as any).turnstile.render(containerRef.current, {
          sitekey,
          theme,
          callback: (token: string) => {
            onChangeRef.current?.(token);
          },
          "expired-callback": () => {
            onChangeRef.current?.(null);
          },
          "error-callback": (err: any) => {
            console.warn("Turnstile challenge error:", err);
            onChangeRef.current?.(null);
          },
        });
      } catch (err) {
        console.error("Erro ao renderizar o Turnstile:", err);
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeTurnstile();
      };
      script.onerror = () => {
        console.warn("Falha ao carregar o script do Turnstile. Ativando captcha offline local.");
        window.dispatchEvent(new CustomEvent("turnstile-load-failed"));
      };
      document.body.appendChild(script);
    } else {
      if ((window as any).turnstile) {
        initializeTurnstile();
      } else {
        script.addEventListener("load", initializeTurnstile);
        script.addEventListener("error", () => {
          console.warn("Falha ao carregar o script do Turnstile via listener. Ativando captcha offline local.");
          window.dispatchEvent(new CustomEvent("turnstile-load-failed"));
        });
      }
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
        } catch (e) {}
        widgetIdRef.current = null;
      }
    };
  }, [sitekey, theme]);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center items-center min-h-[65px] w-full transition-opacity duration-300" 
    />
  );
}
