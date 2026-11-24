import { jsonResponse } from "./workerHelpers.js";
import { hashVerificationCode } from "./workerAuthSend.js";
import { getAuthVerificationD1, updateAuthVerificationAttemptsD1, deleteAuthVerificationD1 } from "./workerD1Auth.js";

export async function handleVerifyCode(request, env) {
  let email, code;
  try {
    const body = await request.json();
    email = body.email;
    code = body.code;
  } catch (e) {
    return jsonResponse({ success: false, error: "Payload inválido" }, 400);
  }

  if (!email || !code || typeof email !== "string" || typeof code !== "string") {
    return jsonResponse({ success: false, error: "E-mail e código são obrigatórios" }, 400);
  }

  const emailKey = email.toLowerCase().trim();
  const db = env.DB || env.DATABASE || env.d1;
  let record = null;
  if (db) {
    record = await getAuthVerificationD1(db, emailKey);
  }

  if (!record || !record.code) {
    return jsonResponse({ success: false, error: "Nenhum código foi solicitado para este e-mail" });
  }

  if (record.attempts >= 5 && record.updatedAt && (Date.now() - record.updatedAt < 15 * 60 * 1000)) {
    const remainingMinutes = Math.ceil((15 * 60 * 1000 - (Date.now() - record.updatedAt)) / 60000);
    return jsonResponse({
      success: false,
      attempts: record.attempts || 0,
      error: `Este e-mail está bloqueado por excesso de tentativas. Tente novamente em ${remainingMinutes} minuto(s).`
    });
  }

  if (Date.now() > record.expiresAt) {
    return jsonResponse({ success: false, error: "O código de verificação expirou. Solicite um novo." });
  }

  const inputHash = await hashVerificationCode(emailKey, code);

  if (record.code !== inputHash) {
    const attempts = (record.attempts || 0) + 1;
    let errorMsg = "Código de verificação incorreto.";

    if (attempts >= 5) {
      errorMsg = "Código de verificação incorreto. Seu e-mail foi bloqueado por 15 minutos.";
    } else if (attempts >= 3) {
      errorMsg = `Código incorreto. Você tem mais ${5 - attempts} tentativa(s) antes do bloqueio.`;
    }

    if (db) {
      await updateAuthVerificationAttemptsD1(db, emailKey, attempts);
    }

    return jsonResponse({
      success: false,
      attempts,
      error: errorMsg
    });
  }

  // Verification successful: remove temporary 2FA code
  if (db) {
    await deleteAuthVerificationD1(db, emailKey);
  }

  return jsonResponse({
    success: true,
    verified: true,
    message: "E-mail verificado com sucesso!"
  });
}
