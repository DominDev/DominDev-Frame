import { memo } from 'react';
import type { Photo, Rating } from '../../types';
import type { PhotoStats } from '../../lib/stats';
import { formatAvg, votesLabel } from '../../lib/stats';
import { photoUrl } from '../../lib/photos';
import { StarRating } from '../rating/StarRating';
import { FavoriteButton } from '../rating/FavoriteButton';
import styles from './PhotoCard.module.css';

interface Props {
  photo: Photo;
  edited: boolean;
  myRating: Rating | undefined;
  stats: PhotoStats;
  commentCount: number;
  favorite: boolean;
  /** Na wąskich ekranach gwiazdki zastępuje plakietka - pięć celów po 28 px byłoby nietrafialne. */
  showStars: boolean;
  /** Admin może zdjąć zasłonę ze średnich. */
  revealAverage: boolean;
  onOpen: () => void;
  onRate: (value: Rating | null) => void;
  onToggleFavorite: () => void;
}

function PhotoCardBase({
  photo,
  edited,
  myRating,
  stats,
  commentCount,
  favorite,
  showStars,
  revealAverage,
  onOpen,
  onRate,
  onToggleFavorite,
}: Props) {
  // Średnia pojawia się dopiero po oddaniu własnego głosu. Podpowiadanie cudzych
  // ocen przed własną zamieniłoby "każdy ocenia niezależnie" w fikcję.
  const averageVisible = revealAverage || myRating !== undefined;

  return (
    <figure className={styles.card}>
      <button type="button" className={styles.imageButton} onClick={onOpen}>
        <img
          className={`${styles.image} ${photo.h > photo.w ? styles.portrait : ''}`}
          src={photoUrl(photo, 'thumb')}
          alt={`Zdjęcie ${photo.name}`}
          width={photo.w}
          height={photo.h}
          loading="lazy"
          decoding="async"
        />
        {edited && <span className={styles.editedBadge}>Obrobione</span>}
        {myRating !== undefined && !showStars && (
          <span className={styles.myBadge} aria-label={`Twoja ocena: ${myRating}`}>
            {myRating} ★
          </span>
        )}
      </button>

      <figcaption className={styles.body}>
        <div className={styles.nameRow}>
          <span className={styles.name} title={photo.name}>
            {photo.name}
          </span>
          <FavoriteButton active={favorite} onToggle={onToggleFavorite} photoName={photo.name} />
        </div>

        {showStars && (
          <StarRating
            name={`card-${photo.id}`}
            value={myRating}
            onChange={onRate}
            label={`Twoja ocena zdjęcia ${photo.name}`}
          />
        )}

        <div className={styles.meta}>
          {averageVisible ? (
            stats.count > 0 ? (
              <span className={styles.avg}>
                Średnia: <strong>{formatAvg(stats.avg)}</strong> / 5
                <span className={styles.votes}> ({votesLabel(stats.count)})</span>
              </span>
            ) : (
              <span className={styles.noVotes}>Nikt jeszcze nie ocenił</span>
            )
          ) : (
            <span
              className={styles.hidden}
              title="Po Twojej ocenie pokażemy średnią wszystkich głosów"
            >
              Oceń, aby zobaczyć średnią
            </span>
          )}

          {commentCount > 0 && (
            <span className={styles.comments} title={`Komentarze: ${commentCount}`}>
              {commentCount} 💬
            </span>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

/**
 * Kafelków jest sześćset, a każda zmiana oceny albo komentarza odświeża galerię.
 * Bez memoizacji React przerysowywałby wszystkie przy każdym kliknięciu gwiazdki.
 */
export const PhotoCard = memo(PhotoCardBase);
