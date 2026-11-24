import { authPrimary } from "../firebase";

/**
 * Obtém o Firebase ID Token de forma segura e resiliente,
 * verificando o objeto de usuário recebido ou a instância ativa do Firebase Auth.
 */
export async function getSafeAuthToken(user?: any): Promise<string> {
  if (user && typeof user.getIdToken === "function") {
    try {
      const tok = await user.getIdToken(false);
      if (tok) return tok;
    } catch {}
  }
  try {
    if (!authPrimary.currentUser && typeof (authPrimary as any).authStateReady === "function") {
      await (authPrimary as any).authStateReady();
    }
    if (authPrimary.currentUser && typeof authPrimary.currentUser.getIdToken === "function") {
      const tok = await authPrimary.currentUser.getIdToken(false);
      if (tok) return tok;
    }
  } catch {}
  return "";
}
