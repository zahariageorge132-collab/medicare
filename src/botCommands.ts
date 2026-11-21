// Interpretazione dei comandi Telegram inviati dalla famiglia.
import { T } from './i18n';
import { nextDose, sortedDoses, type ActiveAlarm } from './schedule';
import { withDoses, type HistoryEntry, type Settings } from './storage';
import type { TgIncoming } from './telegram';
import { addDays, formatShortDate, hhmmToMinutes, type ZonedNow } from './time';

export interface BotContext {
  settings(): Settings;
  history(): HistoryEntry[];
  now(): ZonedNow;
  alarm(): ActiveAlarm | null;
  updateSettings(s: Settings): void;
  triggerTest(): void;
  reply(chatId: number, text: string): void;
  sendPhoto(chatId: number): Promise<void>;
  videoRoom(): string;
  startVideo(): Promise<string>;
  stopVideo(): boolean;
}

export async function handleCommand(m: TgIncoming, ctx: BotContext) {
  const s = ctx.settings();
  const [rawCmd, ...args] = m.text.split(/\s+/);
  const cmd = rawCmd.toLowerCase().replace(/@.*$/, ''); // "/stare@NomeBot" -> "/stare"
  const authorized = s.telegram.chats.some((c) => c.id === m.chatId);

  // Abbinamento: /start PIN
  if (cmd === '/start') {
    if (authorized) return ctx.reply(m.chatId, T.bot.help);
    if (args[0] && args[0] === s.pin) {
      ctx.updateSettings({
        ...s,
        telegram: { ...s.telegram, chats: [...s.telegram.chats, { id: m.chatId, name: m.name }] },
      });
      ctx.reply(m.chatId, T.bot.paired(m.name));
      return ctx.reply(m.chatId, T.bot.help);
    }
    return ctx.reply(m.chatId, args[0] ? T.bot.wrongPin : T.bot.unauthorized);
  }

  if (!authorized) return ctx.reply(m.chatId, T.bot.unauthorized);

  switch (cmd) {
    case '/stare':
    case '/status':
      return ctx.reply(m.chatId, statusText(ctx));
    case '/istoric':
      return ctx.reply(m.chatId, historyText(ctx.history(), ctx.now()));
    case '/ore':
      return ctx.reply(m.chatId, hours(args, ctx));
    case '/test':
      ctx.triggerTest();
      return ctx.reply(m.chatId, T.bot.testStarted);
    case '/foto':
      ctx.reply(m.chatId, T.bot.photoTaking);
      try {
        await ctx.sendPhoto(m.chatId);
      } catch {
        ctx.reply(m.chatId, T.bot.photoError);
      }
      return;
    case '/video':
      if (!ctx.videoRoom()) return ctx.reply(m.chatId, T.bot.videoNoRoom);
      ctx.reply(m.chatId, T.bot.videoStarting);
      try {
        const url = await ctx.startVideo();
        return ctx.reply(m.chatId, T.bot.videoLink(url));
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        return ctx.reply(m.chatId, T.bot.videoError(reason));
      }
    case '/stopvideo':
      return ctx.reply(m.chatId, ctx.stopVideo() ? T.bot.videoStopped : T.bot.videoNone);
    default:
      return ctx.reply(m.chatId, T.bot.help);
  }
}

function statusText(ctx: BotContext): string {
  const now = ctx.now();
  const s = ctx.settings();
  const alarm = ctx.alarm();
  const done = new Map(ctx.history().filter((h) => h.date === now.date).map((h) => [h.time, h]));
  const lines = [T.bot.statusHeader(formatShortDate(now.date), now.hhmm), ''];

  if (alarm && !alarm.test) {
    lines.push(T.bot.statusRinging(alarm.label, alarm.time, now.minutes - hhmmToMinutes(alarm.time)));
  } else {
    lines.push(T.bot.statusOk);
    const n = nextDose(now, s);
    if (n) lines.push(T.bot.statusNext(n.time, n.tomorrow));
  }

  lines.push('', T.bot.statusToday);
  sortedDoses(s.doses).forEach((d, i) => {
    const h = done.get(d.time);
    let st: string = T.bot.dosePending;
    if (h?.status === 'taken') st = T.bot.doseTaken(h.confirmedAt ?? '');
    else if (h?.status === 'missed') st = T.bot.doseMissed;
    else if (alarm && !alarm.test && alarm.time === d.time) st = T.bot.doseRinging;
    else if (hhmmToMinutes(d.time) <= now.minutes) st = '—'; // prima dell'installazione
    lines.push(`${d.time}  ${T.doseNames[i] ?? ''}: ${st}`);
  });
  return lines.join('\n');
}

function historyText(history: HistoryEntry[], now: ZonedNow): string {
  const from = addDays(now.date, -6);
  const rows = history.filter((h) => h.date >= from).sort((a, b) => (a.key < b.key ? -1 : 1));
  if (!rows.length) return T.bot.historyEmpty;
  const lines: string[] = [T.bot.historyHeader];
  let current = '';
  for (const h of rows) {
    if (h.date !== current) {
      current = h.date;
      lines.push('', `${formatShortDate(h.date)}`);
    }
    const st = h.status === 'taken' ? T.bot.doseTaken(h.confirmedAt ?? '') : T.bot.doseMissed;
    lines.push(`  ${h.time} ${st}`);
  }
  return lines.join('\n');
}

function hours(args: string[], ctx: BotContext): string {
  const s = ctx.settings();
  if (!args.length) return T.bot.hoursList(sortedDoses(s.doses).map((d) => d.time).join(', '));

  const times = args.map(normalizeTime);
  const valid =
    times.length >= 1 &&
    times.length <= T.doseNames.length &&
    times.every((t): t is string => t !== null) &&
    new Set(times).size === times.length;
  if (!valid) return T.bot.hoursInvalid;

  const doses = sortedDoses((times as string[]).map((t) => ({ id: t, time: t })));
  ctx.updateSettings(withDoses(s, doses, ctx.now()));
  return T.bot.hoursSaved(doses.map((d) => d.time).join(', '));
}

/** Accetta "8", "8:00", "08.00", "0800" → "08:00". */
function normalizeTime(raw: string): string | null {
  const m = raw.replace(',', '').match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
