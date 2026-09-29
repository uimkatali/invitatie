import { pad2 } from './countdown';
import { localDateKey, parseLocalDateTime } from './time';

export interface MonthRef {
  year: number;
  month: number; // 1-12
}

export interface CalendarDay {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_PARAM = /^(\d{4})-(\d{2})$/;

export function parseMonthParam(value: string | undefined, now: Date): MonthRef {
  const match = value ? MONTH_PARAM.exec(value) : null;
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2020 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  }
  const [year, month] = localDateKey(now).split('-').map(Number);
  return { year, month };
}

export function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const index = ref.year * 12 + (ref.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function formatMonthParam(ref: MonthRef): string {
  return `${ref.year}-${pad2(ref.month)}`;
}

function keyOf(utcMs: number): { key: string; day: number; month: number } {
  const d = new Date(utcMs);
  return {
    key: `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`,
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
  };
}

/** Saptamani incepand cu luni. Aritmetica pe zile calendaristice (UTC), fara ore. */
export function monthGrid(ref: MonthRef): CalendarDay[][] {
  const first = Date.UTC(ref.year, ref.month - 1, 1);
  const leading = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate();
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const start = first - leading * DAY_MS;

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells; i++) {
    if (i % 7 === 0) weeks.push([]);
    const { key, day, month } = keyOf(start + i * DAY_MS);
    weeks[weeks.length - 1].push({ key, day, inMonth: month === ref.month });
  }
  return weeks;
}

export function gridRangeUtc(weeks: CalendarDay[][]): { from: Date; to: Date } {
  const firstKey = weeks[0][0].key;
  const lastKey = weeks[weeks.length - 1][6].key;
  const [y, m, d] = lastKey.split('-').map(Number);
  const dayAfter = keyOf(Date.UTC(y, m - 1, d) + DAY_MS).key;
  const from = parseLocalDateTime(`${firstKey}T00:00`);
  const to = parseLocalDateTime(`${dayAfter}T00:00`);
  if (!from || !to) throw new Error('Interval de calendar invalid');
  return { from, to };
}

const monthFormatter = new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function monthLabelRo(ref: MonthRef): string {
  return monthFormatter.format(new Date(Date.UTC(ref.year, ref.month - 1, 15)));
}
