/** Maximum number of simultaneously active share links per owner/media pair. */
export const MAX_SHARES_PER_MEDIA = 3;

/**
 * One Firestore/R2 claim document per link slot. Slot 0 keeps the legacy key so links
 * created before the limit existed stay valid.
 */
export function claimKeysFor(authUid: string, imageId: string): string[] {
  const base = `${authUid}_${imageId}`;
  return Array.from({ length: MAX_SHARES_PER_MEDIA }, (_, slot) => (slot === 0 ? base : `${base}__${slot + 1}`));
}
