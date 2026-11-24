import { getTimestampMs, isSameDay } from './chatTimeHelpers';

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
