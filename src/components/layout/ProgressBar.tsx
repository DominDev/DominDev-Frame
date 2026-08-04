import styles from './ProgressBar.module.css';

interface Props {
  rated: number;
  total: number;
}

/**
 * Postęp oceniania. Przy 594 zdjęciach to nie ozdoba: bez informacji, ile
 * jeszcze zostało, łatwo stracić orientację i porzucić zadanie w połowie.
 */
export function ProgressBar({ rated, total }: Props) {
  const percent = total === 0 ? 0 : Math.round((rated / total) * 100);
  const complete = total > 0 && rated === total;

  return (
    <div className={styles.root}>
      <div className={styles.label}>
        {complete ? (
          <strong>Oceniłeś wszystkie {total} zdjęć</strong>
        ) : (
          <>
            Oceniłeś <strong>{rated}</strong> z {total}
          </>
        )}
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={rated}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Postęp oceniania"
      >
        <div
          className={`${styles.fill} ${complete ? styles.done : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
