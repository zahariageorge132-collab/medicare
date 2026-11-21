import { useEffect, useRef, useState } from 'react';
import { playOnce } from '../audio';
import { T } from '../i18n';
import { isNative, kioskState, startKiosk, stopKiosk } from '../native';
import { sortedDoses } from '../schedule';
import {
  DEFAULT_PIN, loadVoice, saveVoice, withDoses,
  type Dose, type HistoryEntry, type Settings,
} from '../storage';
import type { BotState } from '../telegram';
import { addDays, formatShortDate, nowInZone } from '../time';

export interface RemoteApi {
  state: BotState;
  testMessage(): Promise<boolean>;
  testPhoto(): Promise<boolean>;
}

interface Props {
  settings: Settings;
  history: HistoryEntry[];
  today: string;
  remote: RemoteApi;
  onChange: (s: Settings) => void;
  onTest: () => void;
  onClose: () => void;
}

const IDLE_CLOSE_MS = 3 * 60 * 1000;

export function Admin({ settings, history, today, remote, onChange, onTest, onClose }: Props) {
  // Chiusura automatica dopo 3 minuti di inattività.
  useEffect(() => {
    let id = window.setTimeout(onClose, IDLE_CLOSE_MS);
    const reset = () => {
      clearTimeout(id);
      id = window.setTimeout(onClose, IDLE_CLOSE_MS);
    };
    window.addEventListener('pointerdown', reset);
    window.addEventListener('keydown', reset);
    return () => {
      clearTimeout(id);
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [onClose]);

  return (
    <main className="admin">
      <header className="admin-head">
        <h1>{T.adminTitle}</h1>
        <button type="button" className="btn primary" onClick={onClose}>{T.adminClose}</button>
      </header>

      {settings.pin === DEFAULT_PIN && <div className="warn">{T.pinDefaultWarn}</div>}

      <DosesSection settings={settings} onChange={onChange} />
      <VoiceSection />
      <AlarmSection settings={settings} onChange={onChange} onTest={onTest} />
      <HistorySection history={history} today={today} />
      <RemoteSection settings={settings} remote={remote} onChange={onChange} />
      <PinSection settings={settings} onChange={onChange} />
      <KioskSection settings={settings} onChange={onChange} />
    </main>
  );
}

// ---------------- Orari ----------------
function DosesSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [doses, setDoses] = useState<Dose[]>(() => sortedDoses(settings.doses));
  const [msg, setMsg] = useState('');

  const save = () => {
    const times = doses.map((d) => d.time);
    if (new Set(times).size !== times.length) {
      setMsg(T.dosesInvalid);
      return;
    }
    const sorted = sortedDoses(doses.map((d) => ({ id: d.time, time: d.time })));
    setDoses(sorted);
    onChange(withDoses(settings, sorted, nowInZone()));
    setMsg(T.saved);
  };

  return (
    <section className="card">
      <h2>{T.secDoses}</h2>
      {doses.map((d, i) => (
        <div className="row" key={i}>
          <span className="row-label">{T.doseNames[i] ?? `Doza ${i + 1}`}</span>
          <input
            type="time"
            value={d.time}
            onChange={(e) => {
              setMsg('');
              const next = [...doses];
              next[i] = { ...d, time: e.target.value || d.time };
              setDoses(next);
            }}
          />
          {doses.length > 1 && (
            <button type="button" className="btn" onClick={() => setDoses(doses.filter((_, j) => j !== i))}>
              {T.doseRemove}
            </button>
          )}
        </div>
      ))}
      <div className="row">
        {doses.length < T.doseNames.length && (
          <button type="button" className="btn" onClick={() => setDoses([...doses, { id: 'new', time: '20:00' }])}>
            {T.doseAdd}
          </button>
        )}
        <button type="button" className="btn primary" onClick={save}>{T.save}</button>
        <span className="msg">{msg}</span>
      </div>
    </section>
  );
}

// ---------------- Messaggio vocale ----------------
function VoiceSection() {
  const [voice, setVoice] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVoice().then(setVoice);
  }, []);

  const store = async (b: Blob | null) => {
    await saveVoice(b);
    setVoice(b);
  };

  const startRec = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        store(new Blob(chunks, { type: r.mimeType || 'audio/webm' }));
      };
      r.start();
      rec.current = r;
      setRecording(true);
    } catch {
      setError(T.voiceMicError);
    }
  };

  const stopRec = () => {
    rec.current?.stop();
    rec.current = null;
    setRecording(false);
  };

  return (
    <section className="card">
      <h2>{T.secVoice}</h2>
      <p>{voice ? T.voicePresent : T.voiceNone}</p>
      {recording && <p className="recording">{T.voiceRecording}</p>}
      {error && <p className="error">{error}</p>}
      <div className="row wrap">
        {!recording ? (
          <button type="button" className="btn primary" onClick={startRec}>{T.voiceRecord}</button>
        ) : (
          <button type="button" className="btn danger" onClick={stopRec}>{T.voiceStop}</button>
        )}
        {voice && !recording && (
          <>
            <button type="button" className="btn" onClick={() => playOnce(voice)}>{T.voicePlay}</button>
            <button type="button" className="btn" onClick={() => store(null)}>{T.voiceDelete}</button>
          </>
        )}
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>{T.voiceUpload}</button>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) store(f);
            e.target.value = '';
          }}
        />
      </div>
    </section>
  );
}

// ---------------- Allarme ----------------
function AlarmSection({ settings, onChange, onTest }: {
  settings: Settings; onChange: (s: Settings) => void; onTest: () => void;
}) {
  return (
    <section className="card">
      <h2>{T.secAlarm}</h2>
      <label className="row">
        <input
          type="checkbox"
          checked={settings.maxVolume}
          onChange={(e) => onChange({ ...settings, maxVolume: e.target.checked })}
        />
        <span>{T.maxVolume}</span>
      </label>
      <label className="row">
        <span>{T.maxDuration}</span>
        <input
          type="number"
          min={0}
          max={600}
          value={settings.maxDurationMin}
          onChange={(e) =>
            onChange({ ...settings, maxDurationMin: Math.max(0, Math.min(600, Number(e.target.value) || 0)) })
          }
        />
      </label>
      <button type="button" className="btn primary" onClick={onTest}>{T.testButton}</button>
    </section>
  );
}

// ---------------- Storico ----------------
function HistorySection({ history, today }: { history: HistoryEntry[]; today: string }) {
  const from = addDays(today, -13);
  const rows = history
    .filter((h) => h.date >= from)
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  return (
    <section className="card">
      <h2>{T.secHistory}</h2>
      {rows.length === 0 ? (
        <p>{T.histEmpty}</p>
      ) : (
        <table className="history">
          <thead>
            <tr>
              <th>{T.histDate}</th>
              <th>{T.histDose}</th>
              <th>{T.histPlanned}</th>
              <th>{T.histStatus}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.key} className={h.status}>
                <td>{formatShortDate(h.date)}</td>
                <td>{h.label}</td>
                <td>{h.time}</td>
                <td>{h.status === 'taken' ? T.histTaken(h.confirmedAt ?? '', h.delayMin ?? 0) : T.histMissed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---------------- PIN ----------------
function PinSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <section className="card">
      <h2>{T.secPin}</h2>
      <div className="row">
        <input
          type="password"
          inputMode="numeric"
          placeholder={T.pinNew}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
        />
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (pin.length < 4) return setMsg(T.pinInvalid);
            onChange({ ...settings, pin });
            setPin('');
            setMsg(T.pinChanged);
          }}
        >
          {T.pinChange}
        </button>
        <span className="msg">{msg}</span>
      </div>
    </section>
  );
}

// ---------------- Kiosk ----------------
function KioskSection({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    kioskState().then((s) => s && setOwner(s.deviceOwner));
  }, []);

  return (
    <section className="card">
      <h2>{T.secKiosk}</h2>
      <p>{isNative ? T.kioskInfo : T.kioskWebOnly}</p>
      {isNative && (
        <div className="row wrap">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onChange({ ...settings, kiosk: true });
              startKiosk();
            }}
          >
            {T.kioskOn}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              onChange({ ...settings, kiosk: false });
              stopKiosk();
            }}
          >
            {T.kioskOff}
          </button>
          <span className="msg">{owner ? 'Device Owner ✓' : ''}</span>
        </div>
      )}
    </section>
  );
}

// ---------------- Controllo a distanza (Telegram) ----------------
function RemoteSection({ settings, remote, onChange }: {
  settings: Settings; remote: RemoteApi; onChange: (s: Settings) => void;
}) {
  const tg = settings.telegram;
  const [token, setToken] = useState(tg.token);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const setTg = (patch: Partial<Settings['telegram']>) => onChange({ ...settings, telegram: { ...tg, ...patch } });

  const st = remote.state;
  const stateText =
    st.kind === 'ok' ? T.tgStateOk(st.username)
    : st.kind === 'connecting' ? T.tgStateConnecting
    : st.kind === 'error' ? T.tgStateError(st.message)
    : T.tgStateOff;

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    setMsg('');
    const ok = await fn();
    setBusy(false);
    setMsg(ok ? T.tgSent : T.tgFailed);
  };

  return (
    <section className="card">
      <h2>{T.secRemote}</h2>
      <label className="col">
        <span>{T.tgToken}</span>
        <input
          type="password"
          className="wide"
          autoComplete="off"
          value={token}
          placeholder="123456789:AAH…"
          onChange={(e) => setToken(e.target.value.trim())}
        />
      </label>
      <div className="row wrap">
        <button type="button" className="btn primary" onClick={() => setTg({ token })}>{T.tgSave}</button>
        {tg.token && (
          <button type="button" className="btn" onClick={() => { setToken(''); setTg({ token: '' }); }}>
            {T.tgDisconnect}
          </button>
        )}
        <span className={st.kind === 'error' ? 'error' : 'msg'}>{stateText}</span>
      </div>

      {st.kind === 'ok' && <p className="hint">{T.tgPairHelp(settings.pin)}</p>}

      <h3>{T.tgChats}</h3>
      {tg.chats.length === 0 ? (
        <p>{T.tgNoChats}</p>
      ) : (
        tg.chats.map((c) => (
          <div className="row" key={c.id}>
            <span className="row-label">{c.name}</span>
            <button type="button" className="btn" onClick={() => setTg({ chats: tg.chats.filter((x) => x.id !== c.id) })}>
              {T.doseRemove}
            </button>
          </div>
        ))
      )}

      <label className="row">
        <span>{T.tgAlertAfter}</span>
        <input
          type="number"
          min={0}
          max={600}
          value={tg.alertAfterMin}
          onChange={(e) => setTg({ alertAfterMin: Math.max(0, Math.min(600, Number(e.target.value) || 0)) })}
        />
      </label>
      <label className="row">
        <input type="checkbox" checked={tg.notifyConfirm} onChange={(e) => setTg({ notifyConfirm: e.target.checked })} />
        <span>{T.tgNotifyConfirm}</span>
      </label>
      <label className="row">
        <span>{T.tgCamera}</span>
        <select
          value={settings.camera}
          onChange={(e) => onChange({ ...settings, camera: e.target.value as Settings['camera'] })}
        >
          <option value="user">{T.tgCameraFront}</option>
          <option value="environment">{T.tgCameraBack}</option>
        </select>
      </label>

      <div className="row wrap">
        <button type="button" className="btn" disabled={busy} onClick={() => run(remote.testMessage)}>{T.tgTestMsg}</button>
        <button type="button" className="btn" disabled={busy} onClick={() => run(remote.testPhoto)}>{T.tgTestPhoto}</button>
        <span className="msg">{msg}</span>
      </div>
    </section>
  );
}
