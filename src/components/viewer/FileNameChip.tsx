import { useState } from 'react';
import { copyToClipboard } from '../../lib/csv';
import styles from './PhotoViewer.module.css';

/**
 * Nazwa pliku jako przycisk kopiujący.
 *
 * To ta sama nazwa, która trafia do raportu i po której szuka się oryginału
 * na dysku, więc przepisywanie jej ręcznie byłoby najczęstszym źródłem pomyłek.
 */
export function FileNameChip({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={styles.fileName}
      title="Kliknij, żeby skopiować nazwę pliku"
      onClick={async () => {
        if (await copyToClipboard(name)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
    >
      <span>{name}</span>
      <span className={styles.copyHint}>{copied ? 'skopiowano' : 'kopiuj'}</span>
    </button>
  );
}
