// Salvataggio locale: impostazioni e storico in localStorage,
// messaggio vocale (file audio) in IndexedDB.

export interface Dose {
  id: string;
  time: string; // "HH:MM"
}

export interface Settings {
  doses: Dose[];
  pin: string;
  maxVolume: boolean;
  maxDurationMin: number; // 0 = l'allarme suona finché non si preme il pulsante
  kiosk: boolean;
  /** Le dosi programmate prima di questo momento (data+minuti) vengono ignorate. */
  activeSince: { date: string; minutes: number };
}

export type DoseStatus = 'taken' | 'missed';

export interface HistoryEntry {
  key: string; // `${date}#${time}`
  date: string;
  time: string; // ora programmata
  label: string;
  status: DoseStatus;
  confirmedAt?: string; // "HH:MM"
  delayMin?: number;
}

const SETTINGS_KEY = 'medicare.settings.v1';
const HISTORY_KEY = 'medicare.history.v1';
const HISTORY_DAYS = 60;

export const DEFAULT_PIN = '1234';

export function defaultSettings(activeSince: Settings['activeSince']): Settings {
  return {
    doses: ['08:00', '11:00', '14:00', '17:00'].map((time) => ({ id: time, time })),
    pin: DEFAULT_PIN,
    maxVolume: true,
    maxDurationMin: 120,
    kiosk: false,
    activeSince,
  };
}

export function loadSettings(activeSince: Settings['activeSince']): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings(activeSince), ...JSON.parse(raw) };
  } catch { /* dati corrotti: si riparte dai predefiniti */ }
  const s = defaultSettings(activeSince);
  saveSettings(s);
  return s;
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveHistory(h: HistoryEntry[], today: string) {
  // tieni solo gli ultimi HISTORY_DAYS giorni
  const [y, m, d] = today.split('-').map(Number);
  const limit = new Date(Date.UTC(y, m - 1, d - HISTORY_DAYS)).toISOString().slice(0, 10);
  const trimmed = h.filter((e) => e.date >= limit);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

// ---------- messaggio vocale (IndexedDB) ----------
const DB_NAME = 'medicare';
const STORE = 'audio';
const VOICE_KEY = 'voice';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVoice(blob: Blob | null): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    if (blob) tx.objectStore(STORE).put(blob, VOICE_KEY);
    else tx.objectStore(STORE).delete(VOICE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadVoice(): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(VOICE_KEY);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
