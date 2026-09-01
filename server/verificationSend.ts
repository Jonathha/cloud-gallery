import { Request, Response } from "express";
import { verificationStore } from "./verificationStore";

export async function sendCode(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório" });
  }

  const emailKey = email.toLowerCase().trim();
  const existing = verificationStore.get(emailKey);

  // Check if the email is currently blocked
  if (existing && existing.blockedUntil && Date.now() < existing.blockedUntil) {
    const remainingMinutes = Math.ceil((existing.blockedUntil - Date.now()) / 60000);
    return res.json({
      success: false,
      blockedUntil: existing.blockedUntil,
      attempts: existing.attempts,
      error: `Este e-mail está temporariamente bloqueado por excesso de tentativas incorretas. Tente novamente em ${remainingMinutes} minuto(s).`
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Retain previous attempts & block state if we are overwriting, unless block has expired
  const currentAttempts = (existing && existing.blockedUntil && Date.now() >= existing.blockedUntil) ? 0 : (existing ? existing.attempts : 0);
  const currentBlockedUntil = (existing && existing.blockedUntil && Date.now() >= existing.blockedUntil) ? null : (existing ? existing.blockedUntil : null);

  verificationStore.set(emailKey, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
    attempts: currentAttempts,
    blockedUntil: currentBlockedUntil
  });

  const RESEND_KEY = process.env.RESEND_API_KEY || "";
  if (!RESEND_KEY) {
    console.warn("[Verification] RESEND_API_KEY is not configured.");
    return false;
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px; border-radius: 24px; max-width: 440px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 56px; height: 56px; background-color: rgba(255,255,255,0.04); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1); margin: 0 auto; display: table;">
          <div style="display: table-cell; vertical-align: middle; text-align: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
              <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
        </div>
        <h2 style="font-size: 24px; font-weight: 800; margin-top: 16px; margin-bottom: 4px; color: #ffffff; letter-spacing: -0.025em;">Cloud Gallery</h2>
        <p style="color: #71717a; font-size: 14px; margin: 0;">Código de Verificação de Segurança</p>
      </div>
      
      <div style="background-color: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.06); padding: 28px; border-radius: 20px; text-align: center; margin-bottom: 24px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.02);">
        <p style="color: #a1a1aa; font-size: 14px; margin-top: 0; margin-bottom: 16px; font-weight: 500;">Seu código de confirmação é:</p>
        <div style="font-size: 38px; font-weight: 800; letter-spacing: 0.15em; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin: 12px 0;">${code}</div>
        <p style="color: #52525b; font-size: 12px; margin-top: 16px; margin-bottom: 0;">Válido por 10 minutos.</p>
      </div>
      
      <p style="color: #52525b; font-size: 12px; text-align: center; line-height: 1.6; margin: 0; padding: 0 10px;">
        Se você não solicitou este código, por favor ignore este e-mail. Nenhuma ação é necessária.
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [email],
        subject: `Código de Verificação: ${code}`,
        html: htmlContent
      })
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("[Server] Resend error:", data);
      let userFriendlyError = data.message || "Falha ao enviar e-mail. Verifique se o e-mail está autorizado no Resend Sandbox.";
      
      // Detect Resend sandbox restriction error
      if (data.message && data.message.includes("testing emails to your own email address")) {
        userFriendlyError = `Como a conta do Resend está no modo de teste (Sandbox), você só pode enviar e-mails de teste para o seu próprio e-mail cadastrado (jogonesteterp@gmail.com). Por favor, use este e-mail para testar o cadastro, ou ative um domínio próprio no Resend.`;
      } else if (data.name === "validation_error") {
        userFriendlyError = `Erro de validação no Resend: ${data.message || "Verifique se o e-mail inserido é válido e permitido."}`;
      }

      return res.json({ 
        success: false,
        error: userFriendlyError
      });
    }

    res.json({ success: true, message: "Código enviado com sucesso!" });
  } catch (err: any) {
    console.error("[Server] Failed to send email via Resend:", err);
    res.json({ success: false, error: "Erro interno do servidor ao enviar código por e-mail." });
  }
}
