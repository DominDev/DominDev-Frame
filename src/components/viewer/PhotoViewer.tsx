import { useEffect, useRef } from 'react';
import type { Comment, Photo, Rating } from '../../types';
import type { PhotoStats } from '../../lib/stats';
import { statsFor } from '../../lib/stats';
import { photoUrl, prefetch } from '../../lib/photos';
import { PREFETCH_AHEAD, RATING_VALUES } from '../../config/constants';
import { useIsWide } from '../../hooks/useMediaQuery';
import { MagnifierImage } from './MagnifierImage';
import { ViewerPanel } from './ViewerPanel';
import styles from './PhotoViewer.module.css';

interface Props {
  photos: Photo[];
  index: number;
  myRatings: Record<string, Rating>;
  myFavorites: Record<string, true>;
  stats: Map<string, PhotoStats>;
  comments: Comment[];
  currentUid: string;
  admin: boolean;
  revealAverage: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onRate: (photoId: string, value: Rating | null) => void;
  onToggleFavorite: (photoId: string) => void;
  onAddComment: (photoId: string, text: string) => Promise<void>;
  onEditComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

/**
 * Tryb skupienia: jedno zdjęcie na pełnym ekranie.
 *
 * Przy 594 zdjęciach to jest właściwy sposób przejścia całej sesji - ocena
 * klawiszem, strzałka dalej, bez wracania do siatki i szukania miejsca,
 * w którym się skończyło.
 */
export function PhotoViewer({
  photos,
  index,
  myRatings,
  myFavorites,
  stats,
  comments,
  currentUid,
  admin,
  revealAverage,
  onClose,
  onNavigate,
  onRate,
  onToggleFavorite,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const wide = useIsWide();
  const photo = photos[index];

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Pobranie kilku kolejnych zdjęć z wyprzedzeniem. Bucket stoi w Iowa, więc bez
  // tego każde naciśnięcie strzałki kosztowałoby zauważalną chwilę oczekiwania.
  useEffect(() => {
    for (let i = 1; i <= PREFETCH_AHEAD; i++) {
      const next = photos[index + i];
      if (next) prefetch(photoUrl(next, 'full'));
    }
  }, [photos, index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // W polu komentarza klawisze mają służyć do pisania, a nie do oceniania.
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      if (e.key === 'ArrowRight' && index < photos.length - 1) {
        e.preventDefault();
        onNavigate(index + 1);
      } else if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        onNavigate(index - 1);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onToggleFavorite(photo.id);
      } else if (RATING_VALUES.some((v) => String(v) === e.key)) {
        e.preventDefault();
        onRate(photo.id, Number(e.key) as Rating);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, photo, photos.length, onNavigate, onRate, onToggleFavorite]);

  if (!photo) return null;

  const photoComments = comments.filter((c) => c.photoId === photo.id);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose}>
      <div className={styles.layout}>
        <div className={styles.stage}>
          <button type="button" className={styles.close} onClick={onClose} title="Zamknij (Esc)">
            <span aria-hidden="true">✕</span>
            <span className="visuallyHidden">Zamknij podgląd</span>
          </button>

          <button
            type="button"
            className={`${styles.nav} ${styles.prev}`}
            onClick={() => onNavigate(index - 1)}
            disabled={index === 0}
            title="Poprzednie (strzałka w lewo)"
          >
            <span aria-hidden="true">‹</span>
            <span className="visuallyHidden">Poprzednie zdjęcie</span>
          </button>

          <MagnifierImage
            src={photoUrl(photo, 'full')}
            alt={`Zdjęcie ${photo.name}`}
            width={photo.w}
            height={photo.h}
            enabled={wide}
          />

          <button
            type="button"
            className={`${styles.nav} ${styles.next}`}
            onClick={() => onNavigate(index + 1)}
            disabled={index === photos.length - 1}
            title="Następne (strzałka w prawo)"
          >
            <span aria-hidden="true">›</span>
            <span className="visuallyHidden">Następne zdjęcie</span>
          </button>

          {wide && <p className={styles.lensHint}>Najedź kursorem, żeby powiększyć fragment</p>}
        </div>

        <ViewerPanel
          photo={photo}
          position={`${index + 1} z ${photos.length}`}
          myRating={myRatings[photo.id]}
          stats={statsFor(stats, photo.id)}
          favorite={myFavorites[photo.id] === true}
          revealAverage={revealAverage}
          comments={photoComments}
          currentUid={currentUid}
          admin={admin}
          onRate={(v) => onRate(photo.id, v)}
          onToggleFavorite={() => onToggleFavorite(photo.id)}
          onAddComment={(text) => onAddComment(photo.id, text)}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
        />
      </div>
    </dialog>
  );
}
