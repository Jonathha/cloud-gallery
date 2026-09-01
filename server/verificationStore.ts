export const verificationStore = new Map<string, { code: string; expiresAt: number; attempts: number; blockedUntil: number | null }>();
