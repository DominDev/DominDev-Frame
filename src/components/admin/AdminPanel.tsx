import type { FavoritesByUser, Photo, RatingsByUser } from '../../types';
import type { PhotoStats } from '../../lib/stats';
import { RatingReport } from './RatingReport';
import { FavoritesReport } from './FavoritesReport';
import { ProgressReport } from './ProgressReport';
import styles from './Admin.module.css';

interface Props {
  photos: Photo[];
  ratings: RatingsByUser;
  favorites: FavoritesByUser;
  stats: Map<string, PhotoStats>;
  revealAverages: boolean;
  onToggleReveal: (value: boolean) => void;
}

export function AdminPanel({
  photos,
  ratings,
  favorites,
  stats,
  revealAverages,
  onToggleReveal,
}: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <h1 className={styles.pageTitle}>Raporty</h1>
        <label className={styles.inlineLabel}>
          <input
            type="checkbox"
            checked={revealAverages}
            onChange={(e) => onToggleReveal(e.target.checked)}
          />
          Pokazuj wszystkie średnie w galerii, także przy nieocenionych przeze mnie
        </label>
      </div>

      <ProgressReport ratings={ratings} total={photos.length} />
      <RatingReport photos={photos} ratings={ratings} stats={stats} />
      <FavoritesReport photos={photos} favorites={favorites} />
    </div>
  );
}
