// Videochiamata con la famiglia tramite Jitsi Meet (gratuito, nessun server).
// Il tablet entra da solo nella stanza. La famiglia apre lo stesso link e vede/sente.
// Sul tablet il video della chiamata NON occupa lo schermo (resta l'orologio),
// ma per tutta la durata resta un avviso ben visibile che la videochiamata è attiva,
// e la voce della famiglia si sente dall'altoparlante del tablet.

const JITSI_DOMAIN = 'meet.jit.si';
const SCRIPT_URL = `https://${JITSI_DOMAIN}/external_api.js`;
const MAX_MINUTES = 15; // la chiamata si chiude da sola dopo questo tempo

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JitsiApi = any;

let api: JitsiApi = null;
let container: HTMLDivElement | null = null;
let endTimer: number | null = null;

export function newRoom(): string {
  const rnd = () => Math.random().toString(36).slice(2);
  return `medicare-${rnd()}${rnd()}`;
}

export function roomUrl(room: string): string {
  return `https://${JITSI_DOMAIN}/${room}`;
}

export const callActive = () => !!api;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).JitsiMeetExternalAPI) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Nu s-a putut încărca videoconvorbirea'));
    document.head.appendChild(s);
  });
}

export interface VideoHandlers {
  onStart(): void;
  onEnd(): void;
}

export async function startCall(room: string, h: VideoHandlers): Promise<void> {
  await stopCall();
  await loadScript();

  container = document.createElement('div');
  container.className = 'video-hidden';
  document.body.appendChild(container);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ext = (window as any).JitsiMeetExternalAPI;
  api = new Ext(JITSI_DOMAIN, {
    roomName: room,
    parentNode: container,
    width: 320,
    height: 240,
    configOverwrite: {
      prejoinPageEnabled: false,
      disableDeepLinking: true,
      startWithAudioMuted: false,
      startWithVideoMuted: false,
      disableInviteFunctions: true,
    },
    interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
    userInfo: { displayName: 'Tableta' },
  });

  const end = () => {
    stopCall();
    h.onEnd();
  };
  api.addEventListener('videoConferenceLeft', end);
  api.addEventListener('readyToClose', end);
  endTimer = window.setTimeout(end, MAX_MINUTES * 60000);

  h.onStart();
}

export async function stopCall(): Promise<void> {
  if (endTimer !== null) {
    clearTimeout(endTimer);
    endTimer = null;
  }
  try {
    api?.dispose();
  } catch {
    /* già chiusa */
  }
  api = null;
  if (container) {
    container.remove();
    container = null;
  }
}
