import { jsonResponse } from "./workerHelpers.js";
import { getFirestoreDocREST, setFirestoreDocREST } from "./workerFirestoreREST.js";

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
  
  // Check rate limiting / blocking via Firestore REST
  let existing = null;
  try {
    existing = await getFirestoreDocREST('email_verifications', emailKey);
  } catch (fsErr) {
    console.warn("[AuthSend] Could not read existing email_verification from Firestore:", fsErr.message);
  }

  if (existing && existing.blockedUntil && Date.now() < existing.blockedUntil) {
    const remainingMinutes = Math.ceil((existing.blockedUntil - Date.now()) / 60000);
    return jsonResponse({
      success: false,
      blockedUntil: existing.blockedUntil,
      attempts: existing.attempts || 0,
      error: `Este e-mail está temporariamente bloqueado. Tente novamente em ${remainingMinutes} minuto(s).`
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await hashVerificationCode(emailKey, code);

  const currentAttempts = (existing && existing.blockedUntil && Date.now() >= existing.blockedUntil) ? 0 : (existing ? (existing.attempts || 0) : 0);
  const currentBlockedUntil = (existing && existing.blockedUntil && Date.now() >= existing.blockedUntil) ? null : (existing ? (existing.blockedUntil || null) : null);

  const record = {
    email: emailKey,
    codeHash,
    codeSentAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: currentAttempts,
    blockedUntil: currentBlockedUntil,
    verified: false
  };

  try {
    await setFirestoreDocREST('email_verifications', emailKey, record);
  } catch (saveErr) {
    console.error("[AuthSend] Failed to persist verification record in Firestore:", saveErr.message);
    return jsonResponse({ success: false, error: "Erro interno ao registrar código de verificação." }, 500);
  }

  // Send email via Resend
  const resendKey = env.RESEND_API_KEY || "";
  if (!resendKey) {
    return false;
  }
  
  const htmlContent = `
    <div style="font-family: sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px; border-radius: 24px; max-width: 440px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0;">Cloud Gallery</h2>
        <p style="color: #71717a; font-size: 14px; margin: 4px 0 0 0;">Código de Verificação de Segurança</p>
      </div>
      <div style="background-color: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.06); padding: 28px; border-radius: 20px; text-align: center; margin-bottom: 24px;">
        <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 16px 0;">Seu código de confirmação é:</p>
        <div style="font-size: 38px; font-weight: 800; letter-spacing: 0.15em; color: #ffffff; font-family: monospace; margin: 12px 0;">${code}</div>
        <p style="color: #52525b; font-size: 12px; margin: 16px 0 0 0;">Válido por 10 minutos.</p>
      </div>
      <p style="color: #52525b; font-size: 12px; text-align: center; line-height: 1.6; margin: 0;">
        Se você não solicitou este código, por favor ignore este e-mail.
      </p>
    </div>
  `;

  try {
    const mailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [emailKey],
        subject: `Código de Verificação: ${code}`,
        html: htmlContent
      })
    });

    const mailData = await mailRes.json();
    if (!mailRes.ok) {
      return jsonResponse({ success: false, error: mailData.message || "Falha ao enviar e-mail." });
    }
    return jsonResponse({ success: true, message: "Código enviado com sucesso!" });
  } catch (mailErr) {
    return jsonResponse({ success: false, error: "Erro ao conectar com o serviço de e-mail." });
  }
}

