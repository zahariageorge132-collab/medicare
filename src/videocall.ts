// Videochiamata su una "stanza fissa" configurata dal familiare (es. Daily.co, gratuito).
// Il tablet entra da solo nella stanza; la famiglia apre lo stesso link dal telefono.
// Sul tablet la chiamata NON occupa lo schermo (resta l'orologio), con un avviso sempre
// visibile, e la voce della famiglia si sente dall'altoparlante.
//
// - se il link è di Daily.co: uso il loro SDK, che entra subito senza schermata intermedia
// - altrimenti: carico la stanza in un iframe nascosto (funziona con i servizi che
//   entrano automaticamente dal solo link)

const MAX_MINUTES = 15; // la chiamata si chiude da sola dopo questo tempo

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

let daily: AnyObj = null;
let container: HTMLDivElement | null = null;
let endTimer: number | null = null;

export const callActive = () => !!container;

function loadScript(src: string, isReady: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isReady()) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Daily nu s-a încărcat (internet?)'));
    document.head.appendChild(s);
  });
}

export interface VideoHandlers {
  onStart(): void;
  onEnd(): void;
}

export async function startCall(roomUrl: string, h: VideoHandlers): Promise<void> {
  await stopCall();
  container = document.createElement('div');
  container.className = 'video-hidden';
  document.body.appendChild(container);

  const end = () => {
    stopCall();
    h.onEnd();
  };

  if (/\.daily\.co\//i.test(roomUrl)) {
    await loadScript(
      'https://unpkg.com/@daily-co/daily-js',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => !!(window as AnyObj).DailyIframe,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DailyIframe = (window as AnyObj).DailyIframe;
    daily = DailyIframe.createFrame(container, {
      showLeaveButton: false,
      iframeStyle: { width: '320px', height: '240px', border: '0' },
    });
    daily.on('left-meeting', end);
    daily.on('error', (ev: AnyObj) => {
      const msg = ev?.errorMsg || ev?.error?.msg;
      stopCall();
      h.onEnd();
      if (msg) console.warn('[daily]', msg);
    });
    // chiede subito i permessi di camera/microfono, così un rifiuto è chiaro
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((st) => st.getTracks().forEach((t) => t.stop()))
      .catch(() => { throw new Error('camera/microfon blocat'); });
    await daily.join({ url: roomUrl });
  } else {
    const iframe = document.createElement('iframe');
    iframe.allow = 'camera; microphone; autoplay; fullscreen; speaker';
    iframe.src = roomUrl;
    container.appendChild(iframe);
  }

  endTimer = window.setTimeout(end, MAX_MINUTES * 60000);
  h.onStart();
}

export async function stopCall(): Promise<void> {
  if (endTimer !== null) {
    clearTimeout(endTimer);
    endTimer = null;
  }
  try {
    await daily?.destroy();
  } catch {
    /* già chiusa */
  }
  daily = null;
  if (container) {
    container.remove();
    container = null;
  }
}
