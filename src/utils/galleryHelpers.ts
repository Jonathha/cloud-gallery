export const getTimestamp = (ca: any): number => {
  if (ca instanceof Date) return ca.getTime();
  if (ca?.toMillis) return ca.toMillis();
  if (ca?.seconds) return ca.seconds * 1000;
  if (typeof ca === 'number') return ca;
  return Date.now();
};
