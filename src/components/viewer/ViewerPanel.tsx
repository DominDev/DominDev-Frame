import type { Comment, Photo, Rating } from '../../types';
import type { PhotoStats } from '../../lib/stats';
import { formatAvg, votesLabel } from '../../lib/stats';
import { RATING_LABELS } from '../../config/constants';
import { StarRating } from '../rating/StarRating';
import { FavoriteButton } from '../rating/FavoriteButton';
import { CommentList } from '../comments/CommentList';
import { CommentForm } from '../comments/CommentForm';
import { FileNameChip } from './FileNameChip';
import styles from './PhotoViewer.module.css';

interface Props {
  photo: Photo;
  position: string;
  myRating: Rating | undefined;
  stats: PhotoStats;
  favorite: boolean;
  revealAverage: boolean;
  comments: Comment[];
  currentUid: string;
  admin: boolean;
  hasEditedVersion: boolean;
  showingEdited: boolean;
  onShowOriginal: () => void;
  onShowEdited: () => void;
  onRate: (value: Rating | null) => void;
  onToggleFavorite: () => void;
  onAddComment: (text: string) => Promise<void>;
  onEditComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function ViewerPanel({
  photo,
  position,
  myRating,
  stats,
  favorite,
  revealAverage,
  comments,
  currentUid,
  admin,
  hasEditedVersion,
  showingEdited,
  onShowOriginal,
  onShowEdited,
  onRate,
  onToggleFavorite,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: Props) {
  const averageVisible = revealAverage || myRating !== undefined;

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHead}>
        <FileNameChip name={photo.name} />
        <span className={styles.position}>{position}</span>
      </div>

      {hasEditedVersion && (
        <section className={styles.versionSection} aria-labelledby={`version-${photo.id}`}>
          <p id={`version-${photo.id}`} className={styles.versionLabel}>
            Wersja zdjęcia
          </p>
          <div className={styles.versionOptions} role="group" aria-label="Wybierz wersję zdjęcia">
            <button
              type="button"
              className={`${styles.versionButton} ${!showingEdited ? styles.versionButtonActive : ''}`}
              onClick={onShowOriginal}
              aria-pressed={!showingEdited}
            >
              Przed obróbką
            </button>
            <button
              type="button"
              className={`${styles.versionButton} ${
                showingEdited ? `${styles.versionButtonActive} ${styles.versionButtonEdited}` : ''
              }`}
              onClick={onShowEdited}
              aria-pressed={showingEdited}
            >
              Po obróbce
            </button>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <p className={styles.ratingQuestion}>Czy warto wybrać to zdjęcie do obróbki?</p>
        <div className={styles.ratingRow}>
          <StarRating
            name={`viewer-${photo.id}`}
            value={myRating}
            onChange={onRate}
            size="lg"
            label={`Twoja ocena zdjęcia ${photo.name}`}
          />
          <FavoriteButton
            active={favorite}
            onToggle={onToggleFavorite}
            photoName={photo.name}
            size="lg"
          />
        </div>

        <p className={styles.ratingHint}>
          {myRating ? (
            <>
              Twoja ocena:{' '}
              <strong>
                {myRating} - {RATING_LABELS[myRating]}
              </strong>
            </>
          ) : (
            'Wybierz od 1 do 5 gwiazdek. Ponowne wybranie tej samej gwiazdki cofa ocenę.'
          )}
        </p>

        <p className={styles.average}>
          {averageVisible ? (
            stats.count > 0 ? (
              <>
                Średnia: <strong>{formatAvg(stats.avg)}</strong> / 5{' '}
                <span className={styles.muted}>({votesLabel(stats.count)})</span>
              </>
            ) : (
              <span className={styles.muted}>Nikt jeszcze nie ocenił tego zdjęcia</span>
            )
          ) : (
            <span className={styles.muted}>
              Średnia odsłoni się po Twojej ocenie, żeby cudze głosy jej nie sugerowały.
            </span>
          )}
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Komentarze {comments.length > 0 && <span className={styles.muted}>({comments.length})</span>}
        </h3>
        <CommentList
          comments={comments}
          currentUid={currentUid}
          admin={admin}
          onEdit={onEditComment}
          onDelete={onDeleteComment}
        />
        <CommentForm onSubmit={onAddComment} />
      </section>
    </aside>
  );
}
