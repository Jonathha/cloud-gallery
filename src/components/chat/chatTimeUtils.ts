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

export function formatChatTimeSeparator(createdAt: any): string {
  const ms = getTimestampMs(createdAt);
  const msgDate = new Date(ms);
  const now = new Date();

  const hours = msgDate.getHours().toString().padStart(2, '0');
  const minutes = msgDate.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isSameDay(msgDate, now)) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(msgDate, yesterday)) {
    return `Ontem, ${timeStr}`;
  }

  const diffTime = now.getTime() - msgDate.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);

  if (diffDays > 0 && diffDays < 7) {
    const rawWeekDay = msgDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    const weekDay = rawWeekDay.charAt(0).toUpperCase() + rawWeekDay.slice(1);
    return `${weekDay}, ${timeStr}`;
  }

  const day = msgDate.getDate().toString().padStart(2, '0');
  const month = (msgDate.getMonth() + 1).toString().padStart(2, '0');
  const year = msgDate.getFullYear();

  if (year === now.getFullYear()) {
    return `${day}/${month}, ${timeStr}`;
  }

  return `${day}/${month}/${year}, ${timeStr}`;
}

export function formatMessageTime(createdAt: any): string {
  const ms = getTimestampMs(createdAt);
  const msgDate = new Date(ms);
  const hours = msgDate.getHours().toString().padStart(2, '0');
  const minutes = msgDate.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
