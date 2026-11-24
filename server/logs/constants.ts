export const LOGS_PROJECT_ID = "gen-lang-client-0718492200";
export const PRIMARY_FIREBASE_API_KEY = "AIzaSyB66ZqvvC3-TZoqvOUqPusY2IGMitx5ZS8";
export const LOGS_API_KEY = PRIMARY_FIREBASE_API_KEY;

export const DEFAULT_ADMIN_EMAILS = [
  "jogonesteterp@gmail.com",
  "matheusvitoor2026@gmail.com",
  "admin@jogonesteterp.com"
];

/**
 * Verifica se um e-mail pertence aos administradores do sistema
 */
export function isUserAdmin(email?: string | null, emailVerified?: boolean): boolean {
  if (!email) return false;
  const adminList = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const allAdmins = [...adminList, ...DEFAULT_ADMIN_EMAILS];
  return allAdmins.includes(email.toLowerCase());
}

export function getClientIpFromRequest(req: any): string {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'];
  if (forwarded) {
    const ipStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ipStr.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '0.0.0.0';
}
