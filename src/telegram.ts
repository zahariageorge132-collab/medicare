// Client minimo per la Bot API di Telegram.
// - long polling (getUpdates) per ricevere i comandi della famiglia
// - invio di messaggi e foto
// - coda offline: i messaggi non inviati (rete assente) vengono ritentati

export interface TgIncoming {
  chatId: number;
  text: string;
  name: string;
}

export type BotState =
  | { kind: 'off' }
  | { kind: 'connecting' }
  | { kind: 'ok'; username: string }
  | { kind: 'error'; message: string };

interface OutItem {
  chatId: number;
  text: string;
}

const OFFSET_KEY = 'medicare.tg.offset';
const OUTBOX_KEY = 'medicare.tg.outbox';
const OUTBOX_MAX = 50;
const POLL_TIMEOUT_S = 50;

/** Indirizzo dell'API (sovrascrivibile solo per i test). */
function apiBase(): string {
  try {
    return localStorage.getItem('medicare.tgApi') || 'https://api.telegram.org';
  } catch {
    return 'https://api.telegram.org';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class TelegramBot {
  private token = '';
  private generation = 0;
  private controllers = new Set<AbortController>();
  private onMessage: (m: TgIncoming) => void;
  private onState: (s: BotState) => void;

  constructor(onMessage: (m: TgIncoming) => void, onState: (s: BotState) => void) {
    this.onMessage = onMessage;
    this.onState = onState;
  }

  start(token: string, commands: { command: string; description: string }[]) {
    this.stop();
    this.token = token.trim();
    if (!this.token) {
      this.onState({ kind: 'off' });
      return;
    }
    const gen = ++this.generation;
    this.onState({ kind: 'connecting' });
    this.run(gen, commands);
  }

  stop() {
    this.generation++;
    this.controllers.forEach((c) => c.abort());
    this.controllers.clear();
  }

  get active() {
    return !!this.token;
  }

  /** Invia un testo; se fallisce lo mette in coda. */
  async send(chatId: number, text: string): Promise<boolean> {
    try {
      await this.call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true });
      return true;
    } catch {
      this.enqueue({ chatId, text });
      return false;
    }
  }

  async sendPhoto(chatId: number, photo: Blob, caption: string): Promise<void> {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption);
    form.append('photo', photo, 'foto.jpg');
    await this.call('sendPhoto', form);
  }

  // ---------------------------------------------------------------

  private async run(gen: number, commands: { command: string; description: string }[]) {
    let backoff = 2000;
    let connected = false;
    while (gen === this.generation) {
      try {
        if (!connected) {
          const me = await this.call<{ username: string }>('getMe', {});
          if (gen !== this.generation) return;
          this.call('setMyCommands', { commands }).catch(() => {});
          this.onState({ kind: 'ok', username: me.username });
          connected = true;
        }
        await this.flushOutbox();
        const updates = await this.call<TgUpdate[]>(
          'getUpdates',
          { offset: this.offset(), timeout: POLL_TIMEOUT_S, allowed_updates: ['message'] },
          (POLL_TIMEOUT_S + 15) * 1000,
        );
        if (gen !== this.generation) return;
        for (const u of updates) {
          this.setOffset(u.update_id + 1);
          const m = u.message;
          if (m?.text && m.chat) {
            const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || String(m.chat.id);
            try {
              this.onMessage({ chatId: m.chat.id, text: m.text.trim(), name });
            } catch (e) {
              console.warn('[telegram] handler', e);
            }
          }
        }
        backoff = 2000;
      } catch (e) {
        if (gen !== this.generation) return;
        const msg = e instanceof Error ? e.message : String(e);
        // 401/404 = token sbagliato: non ha senso riprovare velocemente
        if (/401|404|Unauthorized|Not Found/i.test(msg)) {
          this.onState({ kind: 'error', message: 'Token greșit' });
          connected = false;
          await sleep(60000);
        } else {
          if (connected) this.onState({ kind: 'error', message: 'Fără internet' });
          connected = false;
          await sleep(backoff);
          backoff = Math.min(backoff * 2, 60000);
        }
      }
    }
  }

  private async call<R = unknown>(method: string, body: object | FormData, timeoutMs = 20000): Promise<R> {
    const ctrl = new AbortController();
    this.controllers.add(ctrl);
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const isForm = body instanceof FormData;
      const res = await fetch(`${apiBase()}/bot${this.token}/${method}`, {
        method: 'POST',
        headers: isForm ? undefined : { 'Content-Type': 'application/json' },
        body: isForm ? body : JSON.stringify(body),
        signal: ctrl.signal,
      });
      const json = (await res.json().catch(() => null)) as { ok: boolean; result: R; description?: string } | null;
      if (!json?.ok) throw new Error(`${res.status} ${json?.description ?? ''}`);
      return json.result;
    } finally {
      clearTimeout(timer);
      this.controllers.delete(ctrl);
    }
  }

  private offset(): number {
    return Number(localStorage.getItem(`${OFFSET_KEY}.${this.botId()}`) || 0);
  }

  private setOffset(n: number) {
    localStorage.setItem(`${OFFSET_KEY}.${this.botId()}`, String(n));
  }

  private botId() {
    return this.token.split(':')[0];
  }

  private enqueue(item: OutItem) {
    const box = this.outbox();
    box.push(item);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(box.slice(-OUTBOX_MAX)));
  }

  private outbox(): OutItem[] {
    try {
      return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private async flushOutbox() {
    let box = this.outbox();
    while (box.length) {
      const item = box[0];
      await this.call('sendMessage', { chat_id: item.chatId, text: item.text });
      box = box.slice(1);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(box));
    }
  }
}

interface TgUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number };
    from?: { first_name?: string; last_name?: string };
  };
}
