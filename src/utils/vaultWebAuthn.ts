export async function verifyDeviceAuth(email: string | null | undefined): Promise<{ success: boolean; errorMsg?: string }> {
  try {
    if (!window.PublicKeyCredential) {
      return { success: true };
    }

    const isAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    if (!isAvailable) {
      return { success: true };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const options: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: "Santuário Cloud Gallery",
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: email || "usuario@cloudgallery",
          displayName: email || "Usuário Cloud Gallery"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        }
      }
    };

    const credential = await navigator.credentials.create(options);
    return { success: !!credential };
  } catch (err: any) {
    console.warn("Device auth error:", err);
    const errMsg = err.message || "";
    if (
      err.name === "SecurityError" || 
      errMsg.includes("iframe") || 
      errMsg.includes("permission") || 
      errMsg.includes("feature is not enabled") || 
      errMsg.includes("Permissions Policy") ||
      errMsg.includes("publickey-credentials-create")
    ) {
      return {
        success: false,
        errorMsg: "Restrição de segurança (Iframe): Clique no botão 'Abrir em nova aba' (canto superior direito do visualizador) para validar com o PIN do seu PC ou celular com segurança."
      };
    }
    if (err.name === "NotAllowedError") {
      return {
        success: false,
        errorMsg: "Autenticação cancelada. Confirme o PIN ou biometria do seu aparelho para continuar."
      };
    }
    return {
      success: false,
      errorMsg: "Falha na validação de segurança. Confirme o PIN/Biometria do seu aparelho."
    };
  }
}
