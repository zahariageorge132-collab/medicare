// Gestione dell'ora nel fuso Europe/Rome, indipendentemente dal fuso del tablet.
import { T } from './i18n';

export const TIME_ZONE = 'Europe/Rome';

export interface ZonedNow {
  date: string; // YYYY-MM-DD
  minutes: number; // minuti dalla mezzanotte
  hhmm: string; // "13:45"
  seconds: number;
  weekday: number; // 0 = domenica
  day: number;
  month: number; // 0-11
}

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function nowInZone(d: Date = new Date()): ZonedNow {
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const y = +p.year, mo = +p.month, da = +p.day;
  const h = +p.hour % 24, mi = +p.minute;
  const date = `${p.year}-${p.month}-${p.day}`;
  return {
    date,
    minutes: h * 60 + mi,
    hhmm: `${pad(h)}:${pad(mi)}`,
    seconds: +p.second,
    weekday: new Date(Date.UTC(y, mo - 1, da)).getUTCDay(),
    day: da,
    month: mo - 1,
  };
}

export const pad = (n: number) => String(n).padStart(2, '0');

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHhmm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** Aggiunge giorni a una data YYYY-MM-DD. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function formatLongDate(z: ZonedNow): string {
  return `${T.days[z.weekday]}, ${z.day} ${T.months[z.month]}`;
}

export function formatShortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${T.months[m - 1].slice(0, 3)}.`;
}
