import { useCallback, useEffect, useRef, useState } from 'react';
import { AlarmPlayer } from './audio';
import { Admin } from './components/Admin';
import { AlarmScreen } from './components/AlarmScreen';
import { Confirmed } from './components/Confirmed';
import { Home } from './components/Home';
import { PinPad } from './components/PinPad';
import {
  clearDeliveredNotifications, restoreVolume, scheduleBackupNotifications,
  setMaxVolume, startKiosk,
} from './native';
import { evaluate, type ActiveAlarm } from './schedule';
import {
  loadHistory, loadSettings, loadVoice, saveHistory, saveSettings,
  type HistoryEntry, type Settings,
} from './storage';
import { hhmmToMinutes, nowInZone, type ZonedNow } from './time';

type Overlay = 'none' | 'pin' | 'admin' | 'confirmed';

const CONFIRM_SCREEN_MS = 5000;

export default function App() {
  const [now, setNow] = useState<ZonedNow>(() => nowInZone());
  const [settings, setSettings] = useState<Settings>(() =>
    loadSettings({ date: now.date, minutes: now.minutes + 1 }),
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [confirmedAt, setConfirmedAt] = useState('');
  const [testAlarm, setTestAlarm] = useState<ActiveAlarm | null>(null);

  const player = useRef(new AlarmPlayer());
  const ringingKey = useRef<string | null>(null);

  // Orologio: aggiornamento ogni secondo.
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowInZone()), 1000);
    return () => clearInterval(id);
  }, []);

  // All'avvio: notifiche di riserva e blocco schermo (se attivo).
  useEffect(() => {
    scheduleBackupNotifications(settings.doses);
    if (settings.kiosk) startKiosk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { active: scheduled, missed } = evaluate(now, settings, history);

  // Le dosi scadute senza conferma vanno nello storico come "neconfirmată".
  useEffect(() => {
    if (missed.length) {
      setHistory((h) => {
        const keys = new Set(h.map((e) => e.key));
        const add = missed.filter((m) => !keys.has(m.key));
        if (!add.length) return h;
        const next = [...h, ...add];
        saveHistory(next, now.date);
        return next;
      });
    }
  }, [missed, now.date]);

  // Durante il pannello admin l'allarme reale aspetta (il familiare è presente).
  const inAdmin = overlay === 'admin' || overlay === 'pin';
  const alarm = testAlarm ?? (inAdmin ? null : scheduled);

  // Avvio / arresto del suono quando cambia l'allarme attivo.
  useEffect(() => {
    const key = alarm?.key ?? null;
    if (key === ringingKey.current) return;
    ringingKey.current = key;
    if (key) {
      if (settings.maxVolume) setMaxVolume();
      loadVoice().then((v) => {
        if (ringingKey.current === key) player.current.start(v);
      });
    } else {
      player.current.stop();
    }
  }, [alarm?.key, settings.maxVolume]);

  useEffect(
    () => () => {
      player.current.stop();
      ringingKey.current = null;
    },
    [],
  );

  const confirm = useCallback(() => {
    if (!alarm) return;
    player.current.stop();
    ringingKey.current = null;
    if (settings.maxVolume) restoreVolume();
    clearDeliveredNotifications();
    const z = nowInZone();
    if (alarm.test) {
      setTestAlarm(null);
    } else {
      const entry: HistoryEntry = {
        key: alarm.key,
        date: alarm.date,
        time: alarm.time,
        label: alarm.label,
        status: 'taken',
        confirmedAt: z.hhmm,
        delayMin: Math.max(0, z.minutes - hhmmToMinutes(alarm.time)),
      };
      setHistory((h) => {
        const next = [...h.filter((e) => e.key !== entry.key), entry];
        saveHistory(next, z.date);
        return next;
      });
    }
    setConfirmedAt(z.hhmm);
    setOverlay('confirmed');
    window.setTimeout(() => setOverlay((o) => (o === 'confirmed' ? 'none' : o)), CONFIRM_SCREEN_MS);
  }, [alarm, settings.maxVolume]);

  const closeOverlay = useCallback(() => setOverlay('none'), []);

  const updateSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  // ---------- rendering ----------
  if (overlay === 'confirmed') return <Confirmed time={confirmedAt} />;

  if (alarm) return <AlarmScreen alarm={alarm} onConfirm={confirm} />;

  if (overlay === 'pin')
    return (
      <PinPad
        pin={settings.pin}
        onSuccess={() => setOverlay('admin')}
        onCancel={closeOverlay}
      />
    );

  if (overlay === 'admin')
    return (
      <Admin
        settings={settings}
        history={history}
        today={now.date}
        onChange={(s) => {
          updateSettings(s);
          scheduleBackupNotifications(s.doses);
        }}
        onTest={() => {
          setOverlay('none');
          setTestAlarm({ key: `test-${Date.now()}`, date: now.date, time: now.hhmm, label: 'Test', test: true });
        }}
        onClose={closeOverlay}
      />
    );

  return <Home now={now} settings={settings} onSecretAccess={() => setOverlay('pin')} />;
}
