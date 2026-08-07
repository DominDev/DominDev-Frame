import { useEffect, useRef, useState } from 'react';
import type { Comment, EditedPhotosById, Photo, Rating } from '../../types';
import type { PhotoStats } from '../../lib/stats';
import { statsFor } from '../../lib/stats';
import { editedPhotoUrl, photoUrl, prefetch } from '../../lib/photos';
import { resolvePhotoVersion } from '../../lib/photo-versions';
import { PREFETCH_AHEAD, RATING_VALUES } from '../../config/constants';
import { useCanUseHoverLens } from '../../hooks/useMediaQuery';
import { MagnifierImage } from './MagnifierImage';
import { ViewerPanel } from './ViewerPanel';
import styles from './PhotoViewer.module.css';

interface Props {
  photos: Photo[];
  index: number;
  editedPhotos: EditedPhotosById;
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
  editedPhotos,
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
  const hoverLens = useCanUseHoverLens();
  const photo = photos[index];
  // ID zamiast booleanu sprawia, że każde kolejne zdjęcie zaczyna od wersji
  // przed obróbką bez czekania na efekt i bez krótkiego mignięcia złej wersji.
  const [editedPhotoId, setEditedPhotoId] = useState<string | null>(null);
  const editedPhoto = photo ? editedPhotos[photo.id] : undefined;
  const displayed = photo ? resolvePhotoVersion(photo, editedPhoto, editedPhotoId) : null;
  const showingEdited = displayed?.kind === 'edited';

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // Modalny dialog unieruchamia elementy galerii, ale część mobilnych
    // przeglądarek nadal pozwala przesuwać dokument pod spodem. Blokujemy tylko
    // stronę, nie wewnętrzny obszar zdjęcia, więc gesty pan-x/pan-y pozostają bez zmian.
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    if (!dialog.open) dialog.showModal();

    // Zamknięcie przed odmontowaniem: przeglądarka zdejmuje dialog z warstwy
    // wierzchniej sama, ale zostawianie odpiętego elementu w stanie "otwarty"
    // to proszenie się o kłopoty przy kolejnych zmianach.
    return () => {
      if (dialog.open) dialog.close();
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  // Pobranie kilku kolejnych zdjęć z wyprzedzeniem. Bucket stoi w Iowa, więc bez
  // tego każde naciśnięcie strzałki kosztowałoby zauważalną chwilę oczekiwania.
  useEffect(() => {
    for (let i = 1; i <= PREFETCH_AHEAD; i++) {
      const next = photos[index + i];
      if (next) prefetch(photoUrl(next, 'full'));
    }
  }, [photos, index]);

  // Gotowa wersja pobiera się w tle. Pierwsze kliknięcie przełącznika nie
  // powinno kończyć się pustym polem podczas oczekiwania na Storage.
  useEffect(() => {
    if (editedPhoto) prefetch(editedPhotoUrl(editedPhoto, 'full'));
  }, [editedPhoto]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // W polu komentarza klawisze mają służyć do pisania, a nie do oceniania.
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;

      // Gdy fokus jest na powiększonym zdjęciu, strzałki przewijają jego kadr.
      // Nie wolno wtedy przechwycić ich jako nawigacji do innego zdjęcia.
      if (target?.closest('[data-photo-scroll-region]') && e.key.startsWith('Arrow')) return;

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
  const displayedSrc = displayed?.edited
    ? editedPhotoUrl(displayed.edited, 'full')
    : photoUrl(photo, 'full');

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="photo-viewer-title"
      onClose={onClose}
    >
      <h2 id="photo-viewer-title" className="visuallyHidden">
        Podgląd zdjęcia {photo.name}
      </h2>
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
            src={displayedSrc}
            alt={`Zdjęcie ${photo.name} ${showingEdited ? 'po obróbce' : 'przed obróbką'}`}
            width={displayed?.width ?? photo.w}
            height={displayed?.height ?? photo.h}
            hoverLens={hoverLens}
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
          hasEditedVersion={editedPhoto !== undefined}
          showingEdited={showingEdited}
          onShowOriginal={() => setEditedPhotoId(null)}
          onShowEdited={() => setEditedPhotoId(photo.id)}
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
