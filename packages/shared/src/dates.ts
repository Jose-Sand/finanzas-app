/** Date helpers that work on ISO "YYYY-MM-DD" strings, timezone-safe. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** "2026-10" style month key. */
export type MonthKey = string;

export function monthKey(iso: string): MonthKey {
  return iso.slice(0, 7);
}

export function monthRange(key: MonthKey): { start: string; end: string } {
  const [y, m] = key.split('-').map(Number);
  const start = new Date(y ?? 1970, (m ?? 1) - 1, 1);
  const end = new Date(y ?? 1970, m ?? 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y ?? 1970, (m ?? 1) - 1 + delta, 1);
  return toISODate(d).slice(0, 7);
}

export function lastMonths(endKey: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(endKey, i - count + 1));
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function monthLabel(key: MonthKey, long = false): string {
  const [y, m] = key.split('-').map(Number);
  const name = (long ? MONTHS_LONG : MONTHS_SHORT)[(m ?? 1) - 1] ?? '';
  return long ? `${name} ${y}` : name;
}

export function dayLabel(iso: string, today = todayISO()): string {
  if (iso === today) return 'Hoy';
  const t = parseISODate(today);
  t.setDate(t.getDate() - 1);
  if (iso === toISODate(t)) return 'Ayer';
  const d = parseISODate(iso);
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function daysInMonth(key: MonthKey): number {
  return Number(monthRange(key).end.slice(8, 10));
}
