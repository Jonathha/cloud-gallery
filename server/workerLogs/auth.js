const DEFAULT_ADMIN_EMAILS = [
  "jogonesteterp@gmail.com",
  "matheusvitoor2026@gmail.com",
  "admin@jogonesteterp.com"
];

export const PRIMARY_FIREBASE_API_KEY = "AIzaSyB66ZqvvC3-TZoqvOUqPusY2IGMitx5ZS8";

export function isUserAdmin(email, env) {
  if (!email) return false;
  const adminList = (env?.ADMIN_EMAILS || env?.ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allAdmins = [...adminList, ...DEFAULT_ADMIN_EMAILS];
  return allAdmins.includes(email.toLowerCase());
}

const tokenCache = new Map();

/**
 * Valida o Firebase ID Token junto aos servidores do Google Firebase Auth (com cache local temporário)
 */
export async function verifyFirebaseIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") return null;

  const now = Date.now();
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  // Verificação rápida de expiração no payload do JWT
  try {
    const parts = idToken.split(".");
    if (parts.length === 3) {
      const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(payloadBase64));
      if (payload.exp && payload.exp * 1000 < now) {
        return null;
      }
    }
  } catch {
    // Se a decodificação falhar, prossegue para a validação oficial via API
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${PRIMARY_FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.users && json.users.length > 0) {
      const u = json.users[0];
      if (u.disabled) return null;
      const user = {
        uid: u.localId,
        email: u.email || null,
        displayName: u.displayName || null
      };

      // Cache por 60 segundos
      tokenCache.set(idToken, { user, expiresAt: now + 60000 });
      if (tokenCache.size > 200) {
        for (const [k, v] of tokenCache.entries()) {
          if (v.expiresAt <= now) tokenCache.delete(k);
        }
      }
      return user;
    }
  } catch (err) {
    console.error("[WorkerLogs] Erro ao validar token do Firebase Auth:", err);
  }
  return null;
}

export function extractBearerToken(request, body) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  if (body && body.idToken) {
    return body.idToken;
  }
  return null;
}
