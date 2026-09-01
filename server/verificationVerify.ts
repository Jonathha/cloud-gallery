import { Request, Response } from "express";
import { verificationStore } from "./verificationStore";

export function verifyCode(req: Request, res: Response) {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.json({ success: false, error: "E-mail e código são obrigatórios" });
  }

  const emailKey = email.toLowerCase().trim();
  const record = verificationStore.get(emailKey);

  if (!record) {
    return res.json({ success: false, error: "Nenhum código foi solicitado para este e-mail" });
  }

  // Check if the user is currently blocked
  if (record.blockedUntil && Date.now() < record.blockedUntil) {
    const remainingMinutes = Math.ceil((record.blockedUntil - Date.now()) / 60000);
    return res.json({
      success: false,
      blockedUntil: record.blockedUntil,
      attempts: record.attempts,
      error: `Este e-mail está bloqueado por excesso de tentativas incorretas. Tente novamente em ${remainingMinutes} minuto(s).`
    });
  }

  // Check expiry
  if (Date.now() > record.expiresAt) {
    return res.json({ success: false, error: "O código de verificação expirou. Solicite um novo." });
  }

  // Check code correctness
  if (record.code !== code.trim()) {
    record.attempts += 1;
    let blockedUntil: number | null = null;
    let errorMsg = "Código de verificação incorreto.";

    if (record.attempts >= 5) {
      blockedUntil = Date.now() + 15 * 60 * 1000; // Block for 15 minutes
      record.blockedUntil = blockedUntil;
      errorMsg = "Código de verificação incorreto. Seu e-mail foi temporariamente bloqueado por 15 minutos.";
    } else if (record.attempts >= 3) {
      const remaining = 5 - record.attempts;
      errorMsg = `Código incorreto. Você tem mais ${remaining} tentativa(s) antes do seu e-mail ser bloqueado por 15 minutos.`;
    }

    verificationStore.set(emailKey, record);

    return res.json({
      success: false,
      error: errorMsg,
      attempts: record.attempts,
      blockedUntil: blockedUntil
    });
  }

  // Code is valid! Clean it up so it can't be reused, and verify success
  verificationStore.delete(emailKey);
  res.json({ success: true });
}
