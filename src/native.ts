// Ponte verso la parte nativa Android (plugin "Medicare" in MainActivity)
// e notifiche di riserva. Nel browser (sviluppo) tutto diventa no-op.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { T } from './i18n';
import type { Dose } from './storage';
import { hhmmToMinutes } from './time';

interface MedicarePlugin {
  setMaxVolume(): Promise<void>;
  restoreVolume(): Promise<void>;
  startKiosk(): Promise<void>;
  stopKiosk(): Promise<void>;
  isKiosk(): Promise<{ active: boolean; deviceOwner: boolean }>;
}

const Medicare = registerPlugin<MedicarePlugin>('Medicare');
export const isNative = Capacitor.isNativePlatform();

const safe = async <R>(fn: () => Promise<R>): Promise<R | undefined> => {
  if (!isNative) return undefined;
  try {
    return await fn();
  } catch (e) {
    console.warn('[medicare native]', e);
    return undefined;
  }
};

export const setMaxVolume = () => safe(() => Medicare.setMaxVolume());
export const restoreVolume = () => safe(() => Medicare.restoreVolume());
export const startKiosk = () => safe(() => Medicare.startKiosk());
export const stopKiosk = () => safe(() => Medicare.stopKiosk());
export const kioskState = () => safe(() => Medicare.isKiosk());

const CHANNEL = 'medicare-alarm';

/**
 * Notifiche giornaliere di riserva: suonano anche se l'app è stata chiusa.
 * Toccandole si riapre MEDICARE, che mostra subito la schermata di allarme.
 */
export async function scheduleBackupNotifications(doses: Dose[]) {
  await safe(async () => {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions();

    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: 'Medicamente',
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: 'alarm.wav',
    });

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }

    await LocalNotifications.schedule({
      notifications: doses.map((d, i) => {
        const m = hhmmToMinutes(d.time);
        return {
          id: 100 + i,
          channelId: CHANNEL,
          title: T.alarmTitle,
          body: T.alarmTime(d.time),
          schedule: { on: { hour: Math.floor(m / 60), minute: m % 60 }, allowWhileIdle: true },
          ongoing: false,
          autoCancel: true,
        };
      }),
    });
  });
}

export async function clearDeliveredNotifications() {
  await safe(() => LocalNotifications.removeAllDeliveredNotifications());
}
