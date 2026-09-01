import { jsonResponse } from "./workerHelpers.js";
import { getFirestoreDocREST, setFirestoreDocREST } from "./workerFirestoreREST.js";
import { hashVerificationCode } from "./workerAuthSend.js";

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
  let record = null;
  try {
    record = await getFirestoreDocREST('email_verifications', emailKey);
  } catch (fsErr) {
    console.warn("[AuthVerify] Error getting verification record:", fsErr.message);
  }

  if (!record || !record.codeHash) {
    return jsonResponse({ success: false, error: "Nenhum código foi solicitado para este e-mail" });
  }

  if (record.blockedUntil && Date.now() < record.blockedUntil) {
    const remainingMinutes = Math.ceil((record.blockedUntil - Date.now()) / 60000);
    return jsonResponse({
      success: false,
      blockedUntil: record.blockedUntil,
      attempts: record.attempts || 0,
      error: `Este e-mail está bloqueado por excesso de tentativas. Tente novamente em ${remainingMinutes} minuto(s).`
    });
  }

  if (Date.now() > record.expiresAt) {
    return jsonResponse({ success: false, error: "O código de verificação expirou. Solicite um novo." });
  }

  const inputHash = await hashVerificationCode(emailKey, code);

  if (record.codeHash !== inputHash) {
    const attempts = (record.attempts || 0) + 1;
    let blockedUntil = null;
    let errorMsg = "Código de verificação incorreto.";

    if (attempts >= 5) {
      blockedUntil = Date.now() + 15 * 60 * 1000;
      errorMsg = "Código de verificação incorreto. Seu e-mail foi bloqueado por 15 minutos.";
    } else if (attempts >= 3) {
      errorMsg = `Código incorreto. Você tem mais ${5 - attempts} tentativa(s) antes do bloqueio.`;
    }

    try {
      await setFirestoreDocREST('email_verifications', emailKey, {
        email: emailKey,
        codeHash: record.codeHash,
        expiresAt: record.expiresAt,
        attempts,
        blockedUntil,
        verified: false
      });
    } catch (saveErr) {
      console.warn("[AuthVerify] Failed to update failed attempt in Firestore:", saveErr.message);
    }

    return jsonResponse({ success: false, error: errorMsg, attempts, blockedUntil });
  }

  // Single-use code invalidation to prevent reuse
  try {
    await setFirestoreDocREST('email_verifications', emailKey, {
      email: emailKey,
      codeHash: null,
      verified: true,
      verifiedAt: Date.now(),
      attempts: 0,
      blockedUntil: null,
      expiresAt: 0
    });
  } catch (invErr) {
    console.warn("[AuthVerify] Failed to invalidate verification in Firestore:", invErr.message);
  }

  return jsonResponse({ success: true });
}

