import { jsonResponse } from "./workerHelpers.js";
import { getModuleAndId, resetWorkerCaptcha } from "./workerAbuseProtection.js";

async function clearWorkerCaptcha(request, env, moduleToClear) {
  await resetWorkerCaptcha(request, env, moduleToClear);
}

export async function handleVerifyRecaptcha(request, env) {
  try {
    const body = await request.json();
    const { token, isLocalFallback, challenge, nonce, module: requestedModule } = body;
    const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

    const moduleToClear = requestedModule || 'general';

    if (isLocalFallback) {
      if (!challenge || nonce === undefined) {
        return jsonResponse({ success: false, error: "Challenge e Nonce são obrigatórios para validação local." }, 400);
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(challenge + nonce);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashHex.startsWith("0000")) {
        // Limpa o bloqueio do módulo no Durable Object
        await clearWorkerCaptcha(request, env, moduleToClear);
        return jsonResponse({ success: true });
      } else {
        return jsonResponse({ success: false, error: "Assinatura local inválida ou burlada." }, 400);
      }
    }

    if (!token) {
      return jsonResponse({ success: false, error: "O token do Turnstile é obrigatório." }, 400);
    }

    const secretKey = env.TURNSTILE_SECRET_KEY || "0x4AAAAAADwFk6ZJ0nsuBdSHj54wYkrcrtc";
    const verifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip
      })
    });

    const data = await response.json();

    if (data.success) {
      // Limpa o bloqueio do módulo no Durable Object
      await clearWorkerCaptcha(request, env, moduleToClear);
      return jsonResponse({ success: true });
    } else {
      return jsonResponse({ success: false, error: "Falha na validação de segurança do Turnstile.", details: data }, 400);
    }
  } catch (err) {
    return jsonResponse({ success: false, error: `Erro na verificação de segurança: ${err.message}` }, 500);
  }
}
