import { jsonResponse } from "../../workerHelpers.js";
import { validateBanco1Token } from "../../workerChatAuth.js";
import { isUserAdmin } from "../../workerLogs/auth.js";
import { getChatProfile, saveChatProfile } from "../../chatGlobalD1.js";
import { isReservedUsername } from "./chatUsername.js";

const profileMemoryCache = new Map();

export async function auth(request) {
  return validateBanco1Token(request.headers.get("Authorization"));
}

export async function handleChatProfile(request, env) {
  try {
    const user = await auth(request);
    if (request.method === "GET") {
      let profile = profileMemoryCache.get(user.uid);
      if (!profile) {
        profile = await getChatProfile(user.uid, env);
        if (profile) profileMemoryCache.set(user.uid, profile);
      }
      return jsonResponse({ success: true, profile });
    }
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    if (!username || username.length > 80) return jsonResponse({ success: false, error: "Nome de usuário inválido." }, 400);

    const isAdmin = isUserAdmin(user.email, env, user.email_verified);
    if (!isAdmin && isReservedUsername(username)) {
      return jsonResponse({ success: false, error: "Este nome de usuário é reservado para a equipe ou moderação." }, 400);
    }

    const profile = await saveChatProfile(user.uid, username, user.email, env);
    if (profile) profileMemoryCache.set(user.uid, profile);
    return jsonResponse({ success: true, profile });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message || "Erro no perfil do chat." }, 401);
  }
}

export { profileMemoryCache };
