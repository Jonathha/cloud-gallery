export const sessionDecryptedCache = new Map<string, string>();

export function clearSessionDecryptedCache() {
  sessionDecryptedCache.clear();
}

export function getSessionDecryptedCache() {
  return sessionDecryptedCache;
}

export const enforceDataPrefix = (url: string, cType: string) => {
  if (url && !url.startsWith('data:') && !url.startsWith('blob:')) {
    return `data:${cType || 'image/jpeg'};base64,${url}`;
  }
  return url;
};
