export function getLocalShareUrls(userId: string): Record<string, string> {
  if (!userId || typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`cg_share_urls_${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLocalShareUrl(userId: string, shareId: string, url: string) {
  if (!userId || !shareId || !url || typeof window === 'undefined') return;
  try {
    const map = getLocalShareUrls(userId);
    map[shareId] = url;
    localStorage.setItem(`cg_share_urls_${userId}`, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save share URL locally:', e);
  }
}

export function removeLocalShareUrl(userId: string, shareId: string) {
  if (!userId || !shareId || typeof window === 'undefined') return;
  try {
    const map = getLocalShareUrls(userId);
    if (map[shareId]) {
      delete map[shareId];
      localStorage.setItem(`cg_share_urls_${userId}`, JSON.stringify(map));
    }
  } catch (e) {
    console.error('Failed to remove share URL locally:', e);
  }
}
