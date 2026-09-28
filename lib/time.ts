import { pad2 } from './countdown';

export const TIME_ZONE = 'Europe/Bucharest';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function zonedParts(date: Date): ZonedParts {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}

function offsetMinutes(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncated = Math.floor(date.getTime() / 60000) * 60000;
  return (asUtc - truncated) / 60000;
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "YYYY-MM-DDTHH:mm" (valoarea unui input datetime-local) interpretat ca ora Bucurestiului. */
export function parseLocalDateTime(value: string): Date | null {
  const match = LOCAL_INPUT.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let utc = naive - offsetMinutes(new Date(naive)) * 60000;
  utc = naive - offsetMinutes(new Date(utc)) * 60000;

  const check = zonedParts(new Date(utc));
  if (check.year !== year || check.month !== month || check.day !== day) return null;
  return new Date(utc);
}

export function toLocalInputValue(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function localDateKey(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

const longFormatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shortFormatter = new Intl.DateTimeFormat('ro-RO', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateTimeRo(date: Date): string {
  return longFormatter.format(date);
}

export function formatShortRo(date: Date): string {
  return shortFormatter.format(date);
}
