import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlarmPlayer } from './audio';
import { handleCommand, type BotContext } from './botCommands';
import { takePhoto } from './camera';
import { Admin, type RemoteApi } from './components/Admin';
import { AlarmScreen } from './components/AlarmScreen';
import { Confirmed } from './components/Confirmed';
import { Home } from './components/Home';
import { PinPad } from './components/PinPad';
import { T } from './i18n';
import {
  clearDeliveredNotifications, restoreVolume, scheduleBackupNotifications,
  setMaxVolume, startKiosk,
} from './native';
import { evaluate, type ActiveAlarm } from './schedule';
import {
  loadHistory, loadSettings, loadVoice, saveHistory, saveSettings,
  type HistoryEntry, type Settings,
} from './storage';
import { TelegramBot, type BotState } from './telegram';
import { startCall, stopCall } from './videocall';
import { formatShortDate, hhmmToMinutes, nowInZone, type ZonedNow } from './time';

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
  const [botState, setBotState] = useState<BotState>({ kind: 'off' });
  const [cameraOn, setCameraOn] = useState(false);
  const [videoOn, setVideoOn] = useState(false);

  const player = useRef(new AlarmPlayer());
  const ringingKey = useRef<string | null>(null);

  // Riferimenti sempre aggiornati, usati dal bot (che vive fuori dal ciclo di React).
  const settingsRef = useRef(settings);
  const historyRef = useRef(history);
  const alarmRef = useRef<ActiveAlarm | null>(null);
  settingsRef.current = settings;
  historyRef.current = history;

  const updateSettings = useCallback((s: Settings) => {
    settingsRef.current = s;
    setSettings(s);
    saveSettings(s);
  }, []);

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

  // Durante il pannello admin l'allarme reale aspetta (il familiare è presente).
  const inAdmin = overlay === 'admin' || overlay === 'pin';
  const alarm = testAlarm ?? (inAdmin ? null : scheduled);
  alarmRef.current = alarm ?? scheduled;

  // ---------------- Telegram ----------------
  const botRef = useRef<TelegramBot | null>(null);
  const videoOnRef = useRef(false);
  videoOnRef.current = videoOn;

  const broadcast = useCallback((text: string) => {
    const bot = botRef.current;
    if (!bot?.active) return;
    for (const c of settingsRef.current.telegram.chats) bot.send(c.id, text);
  }, []);

  /** Foto con avviso ben visibile sullo schermo del tablet. */
  const photo = useCallback(async (): Promise<Blob> => {
    setCameraOn(true);
    try {
      return await takePhoto(settingsRef.current.camera);
    } finally {
      window.setTimeout(() => setCameraOn(false), 1500);
    }
  }, []);

  const sendPhotoTo = useCallback(
    async (chatId: number) => {
      const blob = await photo();
      const z = nowInZone();
      await botRef.current!.sendPhoto(chatId, blob, T.bot.photoCaption(formatShortDate(z.date), z.hhmm));
    },
    [photo],
  );

  useEffect(() => {
    const ctx: BotContext = {
      settings: () => settingsRef.current,
      history: () => historyRef.current,
      now: () => nowInZone(),
      alarm: () => alarmRef.current,
      updateSettings: (s) => {
        updateSettings(s);
        scheduleBackupNotifications(s.doses);
      },
      triggerTest: () => {
        const z = nowInZone();
        setOverlay('none');
        setTestAlarm({ key: `test-${Date.now()}`, date: z.date, time: z.hhmm, label: 'Test', test: true });
      },
      reply: (chatId, text) => {
        botRef.current?.send(chatId, text);
      },
      sendPhoto: sendPhotoTo,
      videoRoom: () => settingsRef.current.videoRoom,
      startVideo: async () => {
        const url = settingsRef.current.videoRoom;
        await startCall(url, {
          onStart: () => setVideoOn(true),
          onEnd: () => {
            setVideoOn(false);
            broadcast(T.bot.videoStopped);
          },
        });
        return url;
      },
      stopVideo: () => {
        const was = videoOnRef.current;
        stopCall();
        setVideoOn(false);
        return was;
      },
    };
    const bot = new TelegramBot((m) => handleCommand(m, ctx), setBotState);
    botRef.current = bot;
    return () => bot.stop();
  }, [updateSettings, sendPhotoTo]);

  const startedSent = useRef(false);
  useEffect(() => {
    const bot = botRef.current;
    if (!bot) return;
    bot.start(settings.telegram.token, [...T.bot.commands]);
    if (settings.telegram.token && !startedSent.current) {
      startedSent.current = true;
      broadcast(T.bot.started);
    }
  }, [settings.telegram.token, broadcast]);

  // Dosi scadute senza conferma: nello storico come "neconfirmată" + avviso alla famiglia.
  useEffect(() => {
    if (!missed.length) return;
    const keys = new Set(history.map((e) => e.key));
    const add = missed.filter((m) => !keys.has(m.key));
    if (!add.length) return;
    const next = [...history, ...add];
    setHistory(next);
    saveHistory(next, now.date);
    // avvisi solo per le dosi di oggi (non per giorni passati a tablet spento)
    add.filter((m) => m.date === now.date).forEach((m) => broadcast(T.bot.missed(m.label, m.time)));
  }, [missed, history, now.date, broadcast]);

  // Avviso se l'allarme suona da troppo tempo.
  const ringAlerted = useRef(new Set<string>());
  useEffect(() => {
    const after = settings.telegram.alertAfterMin;
    if (!scheduled || after <= 0) return;
    const elapsed = now.minutes - hhmmToMinutes(scheduled.time);
    if (scheduled.date === now.date && elapsed >= after && !ringAlerted.current.has(scheduled.key)) {
      ringAlerted.current.add(scheduled.key);
      broadcast(T.bot.ringing(scheduled.label, scheduled.time, elapsed));
    }
  }, [scheduled, now, settings.telegram.alertAfterMin, broadcast]);

  // ---------------- Audio ----------------
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
      stopCall();
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
      const delay = Math.max(0, z.minutes - hhmmToMinutes(alarm.time));
      const entry: HistoryEntry = {
        key: alarm.key,
        date: alarm.date,
        time: alarm.time,
        label: alarm.label,
        status: 'taken',
        confirmedAt: z.hhmm,
        delayMin: delay,
      };
      const next = [...historyRef.current.filter((e) => e.key !== entry.key), entry];
      historyRef.current = next;
      setHistory(next);
      saveHistory(next, z.date);
      if (settings.telegram.notifyConfirm) broadcast(T.bot.confirmed(alarm.label, alarm.time, z.hhmm, delay));
    }
    setConfirmedAt(z.hhmm);
    setOverlay('confirmed');
    window.setTimeout(() => setOverlay((o) => (o === 'confirmed' ? 'none' : o)), CONFIRM_SCREEN_MS);
  }, [alarm, settings.maxVolume, settings.telegram.notifyConfirm, broadcast]);

  const closeOverlay = useCallback(() => setOverlay('none'), []);

  const remote: RemoteApi = {
    state: botState,
    testMessage: async () => {
      const bot = botRef.current;
      const chats = settingsRef.current.telegram.chats;
      if (!bot?.active || !chats.length) return false;
      const results = await Promise.all(chats.map((c) => bot.send(c.id, T.bot.test)));
      return results.every(Boolean);
    },
    testPhoto: async () => {
      const chats = settingsRef.current.telegram.chats;
      if (!botRef.current?.active || !chats.length) return false;
      try {
        const blob = await photo();
        const z = nowInZone();
        for (const c of chats) {
          await botRef.current.sendPhoto(c.id, blob, T.bot.photoCaption(formatShortDate(z.date), z.hhmm));
        }
        return true;
      } catch {
        return false;
      }
    },
  };

  // ---------- rendering ----------
  let screen: ReactNode;
  if (overlay === 'confirmed') screen = <Confirmed time={confirmedAt} />;
  else if (alarm) screen = <AlarmScreen alarm={alarm} onConfirm={confirm} />;
  else if (overlay === 'pin')
    screen = <PinPad pin={settings.pin} onSuccess={() => setOverlay('admin')} onCancel={closeOverlay} />;
  else if (overlay === 'admin')
    screen = (
      <Admin
        settings={settings}
        history={history}
        today={now.date}
        remote={remote}
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
  else screen = <Home now={now} settings={settings} onSecretAccess={() => setOverlay('pin')} />;

  return (
    <>
      {screen}
      {cameraOn && <div className="camera-banner" role="status">{T.cameraBanner}</div>}
      {videoOn && <div className="camera-banner video-banner" role="status">{T.videoBanner}</div>}
    </>
  );
}
