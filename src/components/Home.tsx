import { useRef } from 'react';
import { T } from '../i18n';
import { nextDose } from '../schedule';
import type { Settings } from '../storage';
import { formatLongDate, type ZonedNow } from '../time';

const SECRET_TAPS = 5;
const SECRET_WINDOW_MS = 3000;

interface Props {
  now: ZonedNow;
  settings: Settings;
  onSecretAccess: () => void;
}

export function Home({ now, settings, onSecretAccess }: Props) {
  const next = nextDose(now, settings);
  const taps = useRef<number[]>([]);

  // Accesso nascosto al pannello: 5 tocchi rapidi sull'orologio (entro 3 secondi).
  const onClockTap = () => {
    const t = Date.now();
    taps.current = [...taps.current.filter((x) => t - x < SECRET_WINDOW_MS), t];
    if (taps.current.length >= SECRET_TAPS) {
      taps.current = [];
      onSecretAccess();
    }
  };

  return (
    <main className="screen home">
      <div className="clock" onClick={onClockTap} aria-label="ceas">
        {now.hhmm}
      </div>
      <div className="date">{formatLongDate(now)}</div>

      <div className="status">{T.allOk}</div>

      <div className="next">
        {next
          ? next.tomorrow
            ? T.nextDoseTomorrow(next.time)
            : T.nextDoseToday(next.time)
          : T.noDoses}
      </div>
    </main>
  );
}
