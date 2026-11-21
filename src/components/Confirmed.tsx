import { T } from '../i18n';

export function Confirmed({ time }: { time: string }) {
  return (
    <main className="screen confirmed">
      <div className="check">✓</div>
      <h1 className="confirm-title">{T.confirmTitle}</h1>
      <div className="confirm-text">{T.confirmText(time)}</div>
    </main>
  );
}
