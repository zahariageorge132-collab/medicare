import { useEffect, useState } from 'react';
import { T } from '../i18n';

interface Props {
  pin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const AUTO_CLOSE_MS = 30000;

export function PinPad({ pin, onSuccess, onCancel }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  // Se nessuno digita, torna da solo alla schermata principale.
  useEffect(() => {
    const id = window.setTimeout(onCancel, AUTO_CLOSE_MS);
    return () => clearTimeout(id);
  }, [value, onCancel]);

  const press = (d: string) => {
    setError(false);
    const v = (value + d).slice(0, 8);
    setValue(v);
    if (v === pin) onSuccess();
    else if (v.length >= pin.length) {
      setError(true);
      setValue('');
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <main className="screen pin">
      <h2>{T.pinTitle}</h2>
      <div className="pin-dots">
        {Array.from({ length: pin.length }).map((_, i) => (
          <span key={i} className={i < value.length ? 'dot on' : 'dot'} />
        ))}
      </div>
      <div className="pin-error">{error ? T.pinWrong : ' '}</div>
      <div className="pin-grid">
        {keys.map((k) => (
          <button key={k} type="button" onClick={() => press(k)}>{k}</button>
        ))}
        <button type="button" className="pin-aux" onClick={onCancel}>{T.pinCancel}</button>
        <button type="button" onClick={() => press('0')}>0</button>
        <button type="button" className="pin-aux" onClick={() => setValue(value.slice(0, -1))}>
          {T.pinDelete}
        </button>
      </div>
    </main>
  );
}
