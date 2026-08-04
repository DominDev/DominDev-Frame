import type { RatingsByUser } from '../../types';
import { ratedCount } from '../../lib/stats';
import { USERS, USER_UIDS } from '../../config/users';
import styles from './Admin.module.css';

interface Props {
  ratings: RatingsByUser;
  total: number;
}

/** Kto już ocenił, a na kogo jeszcze czekamy przed wyciągnięciem wniosków. */
export function ProgressReport({ ratings, total }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Postęp oceniania</h2>

      <ul className={styles.progressList}>
        {USER_UIDS.map((uid) => {
          const rated = ratedCount(ratings[uid]);
          const percent = total === 0 ? 0 : Math.round((rated / total) * 100);

          return (
            <li key={uid} className={styles.progressItem}>
              <span className={styles.progressName}>{USERS[uid].name}</span>
              <div className={styles.progressTrack} aria-hidden="true">
                <div
                  className={`${styles.progressFill} ${rated === total && total > 0 ? styles.progressDone : ''}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className={styles.progressValue}>
                {rated} / {total}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
