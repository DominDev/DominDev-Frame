import { useState, type FormEvent } from 'react';
import { COMMENT_MAX_LENGTH } from '../../config/constants';
import styles from './Comments.module.css';

interface Props {
  onSubmit: (text: string) => Promise<void>;
  /** Tekst początkowy przy edycji istniejącego komentarza. */
  initialText?: string;
  submitLabel?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function CommentForm({
  onSubmit,
  initialText = '',
  submitLabel = 'Dodaj komentarz',
  onCancel,
  autoFocus,
}: Props) {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const tooLong = trimmed.length > COMMENT_MAX_LENGTH;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || tooLong) return;

    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setText(initialText ? trimmed : '');
    } catch (err) {
      console.error(err);
      setError('Nie udało się zapisać komentarza. Sprawdź połączenie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className="visuallyHidden" htmlFor="comment-text">
        Treść komentarza
      </label>
      <textarea
        id="comment-text"
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Napisz, co myślisz o tym zdjęciu..."
        rows={3}
        maxLength={COMMENT_MAX_LENGTH}
        autoFocus={autoFocus}
      />

      <div className={styles.formFooter}>
        <span className={tooLong ? styles.counterOver : styles.counter}>
          {trimmed.length} / {COMMENT_MAX_LENGTH}
        </span>

        <div className={styles.formActions}>
          {onCancel && (
            <button type="button" className={styles.secondary} onClick={onCancel}>
              Anuluj
            </button>
          )}
          <button type="submit" className={styles.primary} disabled={busy || !trimmed || tooLong}>
            {busy ? 'Zapisywanie...' : submitLabel}
          </button>
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
