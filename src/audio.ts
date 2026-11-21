// Riproduzione dell'allarme: suono di avviso + messaggio vocale del familiare,
// ripetuti in ciclo finché non viene chiamato stop().

const PAUSE_MS = 2000;

export class AlarmPlayer {
  private running = false;
  private audio: HTMLAudioElement | null = null;
  private timer: number | null = null;
  private voiceUrl: string | null = null;

  start(voice: Blob | null) {
    this.stop();
    this.running = true;
    this.voiceUrl = voice ? URL.createObjectURL(voice) : null;
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    if (this.audio) {
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.voiceUrl) URL.revokeObjectURL(this.voiceUrl);
    this.voiceUrl = null;
  }

  private async loop() {
    while (this.running) {
      await this.play('./alarm.wav');
      if (!this.running) break;
      if (this.voiceUrl) {
        await this.play(this.voiceUrl);
        if (!this.running) break;
      }
      await this.wait(PAUSE_MS);
    }
  }

  private play(src: string): Promise<void> {
    return new Promise((resolve) => {
      const a = new Audio(src);
      a.volume = 1;
      this.audio = a;
      a.onended = () => resolve();
      a.onerror = () => this.wait(1000).then(resolve);
      a.play().catch(() => this.wait(1000).then(resolve));
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => {
      this.timer = window.setTimeout(r, ms);
    });
  }
}

/** Riproduce una sola volta (per "Ascultă" nel pannello). */
export function playOnce(blob: Blob): HTMLAudioElement {
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  a.onended = () => URL.revokeObjectURL(url);
  a.play().catch(() => URL.revokeObjectURL(url));
  return a;
}
