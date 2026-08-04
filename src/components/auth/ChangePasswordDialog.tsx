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
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState({ current: false, next: false, confirmation: false });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setCurrent('');
      setNext('');
      setConfirmation('');
      setVisible({ current: false, next: false, confirmation: false });
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
  const confirmationMismatch = confirmation.length > 0 && confirmation !== next;

  const passwordField = (
    id: string,
    label: string,
    value: string,
    setValue: (value: string) => void,
    visibilityKey: keyof typeof visible,
    autoComplete: 'current-password' | 'new-password',
    describedBy?: string
  ) => (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordInput}>
        <input
          id={id}
          type={visible[visibilityKey] ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          aria-invalid={visibilityKey === 'confirmation' && confirmationMismatch}
          required
        />
        <button
          type="button"
          className={styles.passwordToggle}
          aria-label={`${visible[visibilityKey] ? 'Ukryj' : 'Pokaż'}: ${label.toLowerCase()}`}
          aria-pressed={visible[visibilityKey]}
          onClick={() => setVisible((state) => ({ ...state, [visibilityKey]: !state[visibilityKey] }))}
        >
          {visible[visibilityKey] ? 'Ukryj' : 'Pokaż'}
        </button>
      </div>
    </div>
  );

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="change-password-title"
      onClose={onClose}
    >
      <div className={styles.inner}>
        <h2 id="change-password-title" className={styles.title}>
          Zmiana hasła
        </h2>

        {done ? (
          <>
            <p className={styles.success}>Hasło zostało zmienione. Zapamiętaj je.</p>
            <button className={styles.primary} type="button" onClick={onClose}>
              Zamknij
            </button>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            {passwordField(
              'cp-current',
              'Obecne hasło',
              current,
              setCurrent,
              'current',
              'current-password',
              'cp-current-note'
            )}
            <p id="cp-current-note" className={styles.note}>
              Dla bezpieczeństwa wpisz ponownie obecne hasło.
            </p>

            {passwordField('cp-next', 'Nowe hasło', next, setNext, 'next', 'new-password')}
            {passwordField(
              'cp-confirmation',
              'Powtórz nowe hasło',
              confirmation,
              setConfirmation,
              'confirmation',
              'new-password',
              confirmationMismatch ? 'cp-confirmation-error' : undefined
            )}
            {confirmationMismatch && (
              <p id="cp-confirmation-error" className={styles.fieldError} role="alert">
                Wpisane hasła nie są takie same.
              </p>
            )}

            <ul className={styles.rules} aria-live="polite">
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
                disabled={
                  busy ||
                  !current ||
                  !isPasswordValid(next) ||
                  !confirmation ||
                  confirmation !== next
                }
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
