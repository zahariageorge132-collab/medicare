import { useEffect, useState } from 'react';
import { T } from '../i18n';
import type { ActiveAlarm } from '../schedule';

// Per evitare conferme involontarie (es. il paziente stava già toccando lo schermo),
// il pulsante si attiva 1,5 secondi dopo la comparsa dell'allarme.
const ARM_DELAY_MS = 1500;

interface Props {
  alarm: ActiveAlarm;
  onConfirm: () => void;
}

export function AlarmScreen({ alarm, onConfirm }: Props) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    setArmed(false);
    const id = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => clearTimeout(id);
  }, [alarm.key]);

  return (
    <main className="screen alarm" role="alert">
      <div className="alarm-top">
        {alarm.test && <div className="test-badge">{T.testAlarm}</div>}
        <h1 className="alarm-title">{T.alarmTitle}</h1>
        <div className="alarm-time">{T.alarmTime(alarm.time)}</div>
      </div>

      <button
        type="button"
        className="big-green"
        disabled={!armed}
        onClick={armed ? onConfirm : undefined}
      >
        {T.alarmButton}
      </button>
    </main>
  );
}
