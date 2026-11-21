// Logica degli allarmi: quale dose sta suonando, quale è la prossima,
// e quali dosi passate vanno segnate come non confermate.
import { T } from './i18n';
import type { Dose, HistoryEntry, Settings } from './storage';
import { addDays, hhmmToMinutes, type ZonedNow } from './time';

export interface ActiveAlarm {
  key: string;
  date: string;
  time: string;
  label: string;
  test?: boolean;
}

export function sortedDoses(doses: Dose[]): Dose[] {
  return [...doses].sort((a, b) => hhmmToMinutes(a.time) - hhmmToMinutes(b.time));
}

export function doseLabel(doses: Dose[], dose: Dose): string {
  const i = sortedDoses(doses).findIndex((d) => d.id === dose.id);
  return T.doseNames[i] ?? `Doza ${i + 1}`;
}

const doseKey = (date: string, time: string) => `${date}#${time}`;

function isAfterActiveSince(s: Settings, date: string, min: number) {
  const a = s.activeSince;
  return date > a.date || (date === a.date && min >= a.minutes);
}

/**
 * Calcola lo stato attuale.
 * - active: la dose che deve suonare adesso (o null)
 * - missed: nuove voci "non confermata" da aggiungere allo storico
 */
export function evaluate(
  now: ZonedNow,
  s: Settings,
  history: HistoryEntry[],
): { active: ActiveAlarm | null; missed: HistoryEntry[] } {
  const done = new Set(history.map((h) => h.key));
  const doses = sortedDoses(s.doses);
  const missed: HistoryEntry[] = [];
  let active: ActiveAlarm | null = null;

  // Controlla oggi e i 7 giorni precedenti (es. tablet spento per qualche giorno).
  for (let back = 7; back >= 0; back--) {
    const date = addDays(now.date, -back);
    for (let i = 0; i < doses.length; i++) {
      const d = doses[i];
      const min = hhmmToMinutes(d.time);
      const key = doseKey(date, d.time);
      if (done.has(key)) continue;
      if (!isAfterActiveSince(s, date, min)) continue;
      if (date === now.date && min > now.minutes) continue; // non ancora arrivata

      const label = T.doseNames[i] ?? `Doza ${i + 1}`;
      // Una dose resta "attiva" fino a: dose successiva, mezzanotte,
      // oppure durata massima impostata.
      const next = date === now.date ? doses[i + 1] : undefined;
      const elapsed = date === now.date ? now.minutes - min : Infinity;
      const overByNext = date !== now.date || (next && now.minutes >= hhmmToMinutes(next.time));
      const overByDuration = s.maxDurationMin > 0 && elapsed >= s.maxDurationMin;

      if (overByNext || overByDuration) {
        missed.push({ key, date, time: d.time, label, status: 'missed' });
      } else {
        active = { key, date, time: d.time, label };
      }
    }
  }
  return { active, missed };
}

/** Prossima dose: { time, tomorrow } */
export function nextDose(now: ZonedNow, s: Settings): { time: string; tomorrow: boolean } | null {
  const doses = sortedDoses(s.doses);
  if (!doses.length) return null;
  const today = doses.find((d) => hhmmToMinutes(d.time) > now.minutes);
  if (today) return { time: today.time, tomorrow: false };
  return { time: doses[0].time, tomorrow: true };
}
