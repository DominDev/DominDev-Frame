import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authErrorMessage, changeOwnPassword } from '../../lib/auth';
import { isPasswordValid, passwordRules } from '../../lib/password';
import styles from './ChangePasswordDialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setCurrent('');
      setNext('');
      setError(null);
      setDone(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await changeOwnPassword(current, next);
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const rules = passwordRules(next);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose}>
      <div className={styles.inner}>
        <h2 className={styles.title}>Zmiana hasła</h2>

        {done ? (
          <>
            <p className={styles.success}>Hasło zostało zmienione. Zapamiętaj je.</p>
            <button className={styles.primary} type="button" onClick={onClose}>
              Zamknij
            </button>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="cp-current">Obecne hasło</label>
              <input
                id="cp-current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
              <p className={styles.note}>
                Firebase prosi o nie ponownie, gdy logowanie nie było świeże.
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="cp-next">Nowe hasło</label>
              <input
                id="cp-next"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <ul className={styles.rules}>
              {rules.map((r) => (
                <li key={r.label} className={r.met ? styles.met : styles.unmet}>
                  <span aria-hidden="true">{r.met ? '✓' : '○'}</span> {r.label}
                </li>
              ))}
            </ul>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <div className={styles.actions}>
              <button className={styles.secondary} type="button" onClick={onClose}>
                Anuluj
              </button>
              <button
                className={styles.primary}
                type="submit"
                disabled={busy || !current || !isPasswordValid(next)}
              >
                {busy ? 'Zapisywanie...' : 'Zmień hasło'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
