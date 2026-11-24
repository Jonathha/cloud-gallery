import { ChatMessage } from './types';

export function getTimestampMs(val: any): number {
  if (!val) return Date.now();
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1e6;
  if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? Date.now() : parsed;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function shouldShowTimeSeparator(currMsg: ChatMessage, prevMsg?: ChatMessage): boolean {
  if (!prevMsg) return true;

  const currMs = getTimestampMs(currMsg.createdAt);
  const prevMs = getTimestampMs(prevMsg.createdAt);

  const currDate = new Date(currMs);
  const prevDate = new Date(prevMs);

  if (!isSameDay(currDate, prevDate)) {
    return true;
  }

  const diffMs = currMs - prevMs;
  return diffMs >= 5 * 60 * 1000;
}
