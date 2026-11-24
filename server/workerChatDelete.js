import { jsonResponse } from "./workerHelpers.js";
import { validateBanco1Token } from "./workerChatAuth.js";
import { getChatServiceAccount } from "./workerChatState.js";
import { importPKCS8, SignJWT } from "jose";

let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function getChatFirestoreAccessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && tokenExpiresAt > now + 60) {
    return cachedAccessToken;
  }

  const { client_email, private_key } = getChatServiceAccount(env);
  const key = await importPKCS8(private_key, "RS256");

  const iat = now;
  const exp = now + 3600;

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore"
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(client_email)
    .setSubject(client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[getChatFirestoreAccessToken] Failed to fetch access token:", errText);
    throw new Error(`Failed to obtain Google access token: ${errText}`);
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in || 3600);
  return cachedAccessToken;
}

export async function handleChatDeleteMessage(request, env) {
  try {
    const authHeader = request.headers.get("Authorization");
    const verifiedUser = await validateBanco1Token(authHeader);

    // Validate admin privileges
    if (verifiedUser.email !== "jogonesteterp@gmail.com" || verifiedUser.email_verified !== true) {
      return jsonResponse({ success: false, error: "Acesso negado. Apenas o administrador pode excluir mensagens." }, 403);
    }

    const body = await request.json().catch(() => ({}));
    const messageId = body.messageId;

    if (!messageId || typeof messageId !== "string") {
      return jsonResponse({ success: false, error: "Parâmetro messageId é obrigatório." }, 400);
    }

    const accessToken = await getChatFirestoreAccessToken(env);
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/chat-809dc/databases/(default)/documents/chat_messages/${encodeURIComponent(messageId)}`;

    const deleteRes = await fetch(firestoreUrl, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });

    if (!deleteRes.ok && deleteRes.status !== 404) {
      const errText = await deleteRes.text();
      console.error("[handleChatDeleteMessage] Firestore delete failed:", deleteRes.status, errText);
      return jsonResponse({ success: false, error: "Erro ao excluir documento no Firestore." }, 500);
    }

    return jsonResponse({
      success: true,
      message: "Mensagem excluída com sucesso.",
      messageId
    });
  } catch (err) {
    console.error("[handleChatDeleteMessage] Erro:", err);
    return jsonResponse({
      success: false,
      error: err.message || "Erro interno ao excluir mensagem."
    }, 500);
  }
}
