import { useState } from "react";
import { getApiUrl } from "../../utils/apiUrl";

export function useVaultCaptcha() {
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  const verifyCaptchaOnBackend = async (token: string, setError: (err: string) => void) => {
    try {
      const response = await fetch(getApiUrl("/api/verify-recaptcha"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data.success) {
        setRecaptchaToken(token);
        setCaptchaVerified(true);
        setError("");
        return true;
      } else {
        setRecaptchaToken(null);
        setCaptchaVerified(false);
        setError(data.error || "Falha na verificação do Captcha. Tente novamente.");
        return false;
      }
    } catch (err) {
      console.error("Erro ao verificar recaptcha no backend:", err);
      setRecaptchaToken(null);
      setCaptchaVerified(false);
      setError("Erro de rede ao validar o Captcha. Tente novamente.");
      return false;
    }
  };

  return {
    showCaptcha,
    setShowCaptcha,
    captchaVerified,
    setCaptchaVerified,
    recaptchaToken,
    setRecaptchaToken,
    verifyCaptchaOnBackend
  };
}
