import { jsonResponse } from "./workerHelpers.js";
import { saveAuthVerificationD1, getAuthVerificationD1 } from "./workerD1Auth.js";

export async function hashVerificationCode(emailKey, code) {
  const enc = new TextEncoder();
  const data = enc.encode(`${emailKey}:${String(code).trim()}:vault_2fa_salt_2026`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function handleSendCode(request, env) {
  let email;
  try {
    const body = await request.json();
    email = body.email;
  } catch (e) {
    return jsonResponse({ success: false, error: "Payload inválido" }, 400);
  }

  if (!email || typeof email !== "string") {
    return jsonResponse({ success: false, error: "E-mail é obrigatório" }, 400);
  }

  const emailKey = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKey)) {
    return jsonResponse({ success: false, error: "Formato de e-mail inválido" }, 400);
  }

  const db = env.DB || env.DATABASE || env.d1;
  let existing = null;
  if (db) {
    existing = await getAuthVerificationD1(db, emailKey);
  }

  if (existing && existing.attempts >= 5 && existing.updatedAt && (Date.now() - existing.updatedAt < 15 * 60 * 1000)) {
    const remainingMinutes = Math.ceil((15 * 60 * 1000 - (Date.now() - existing.updatedAt)) / 60000);
    return jsonResponse({
      success: false,
      attempts: existing.attempts || 0,
      error: `Este e-mail está temporariamente bloqueado. Tente novamente em ${remainingMinutes} minuto(s).`
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await hashVerificationCode(emailKey, code);
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

  if (db) {
    await saveAuthVerificationD1(db, emailKey, codeHash, expiresAt, ip);
  }

  const resendApiKey = env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const emailPayload = {
        from: env.EMAIL_FROM || "Guarly Security <security@guarly.com>",
        to: [emailKey],
        subject: `${code} é o seu código de segurança Guarly`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #09090b; color: #ffffff; border-radius: 16px; border: 1px solid #27272a;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0;">Código de Verificação</h1>
              <p style="color: #a1a1aa; font-size: 14px; margin-top: 8px;">Use o código abaixo para validar sua identidade.</p>
            </div>
            <div style="background: #18181b; border: 1px solid #3f3f46; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #60a5fa;">${code}</span>
            </div>
            <p style="color: #71717a; font-size: 12px; text-align: center; margin: 0;">Este código expira em 10 minutos. Se você não solicitou este código, ignore este e-mail.</p>
          </div>
        `
      };

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });

      if (!resendRes.ok) {
        console.warn("[AuthSend] Resend API error:", resendRes.status);
      }
    } catch (mailErr) {
      console.warn("[AuthSend] Email send error:", mailErr.message);
    }
  }

  return jsonResponse({
    success: true,
    message: "Código de verificação enviado com sucesso.",
    expiresInSeconds: 600
  });
}
