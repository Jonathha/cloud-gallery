import { PRIMARY_FIREBASE_API_KEY } from './constants';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
  email_verified: boolean;
  displayName: string | null;
}

/**
 * Valida o Firebase ID Token contra o endpoint de lookup oficial do Google
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${PRIMARY_FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.users && json.users.length > 0) {
      const u = json.users[0];
      return {
        uid: u.localId,
        email: u.email || null,
        email_verified: Boolean(u.emailVerified),
        displayName: u.displayName || null
      };
    }
  } catch (err) {
    console.error('[ServerLogs] Erro ao validar token do Firebase Auth:', err);
  }
  return null;
}

export function extractBearerToken(req: any): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.body && req.body.idToken) {
    return req.body.idToken;
  }
  return null;
}
