import { useEffect, useRef, useState } from 'react';
import type { Photo, Rating } from '../../types';
import type { PhotoStats } from '../../lib/stats';
import { statsFor } from '../../lib/stats';
import { GALLERY_PAGE_SIZE } from '../../config/constants';
import { PhotoCard } from './PhotoCard';
import styles from './GalleryGrid.module.css';

interface Props {
  photos: Photo[];
  myRatings: Record<string, Rating>;
  myFavorites: Record<string, true>;
  stats: Map<string, PhotoStats>;
  commentCounts: Map<string, number>;
  showStars: boolean;
  revealAverage: boolean;
  onOpen: (photoId: string) => void;
  onRate: (photoId: string, value: Rating | null) => void;
  onToggleFavorite: (photoId: string) => void;
}

export function GalleryGrid({
  photos,
  myRatings,
  myFavorites,
  stats,
  commentCounts,
  showStars,
  revealAverage,
  onOpen,
  onRate,
  onToggleFavorite,
}: Props) {
  const [limit, setLimit] = useState(GALLERY_PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);

  // Zmiana filtrów zmienia listę - wtedy wracamy do pierwszej porcji, bo
  // użytkownik i tak ogląda wynik od początku.
  useEffect(() => setLimit(GALLERY_PAGE_SIZE), [photos]);

  // Doładowywanie przy dojściu do końca listy. Renderowanie 594 kafelków naraz
  // oznaczałoby blisko 3000 pól formularza i zauważalne zacięcie przeglądarki.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= photos.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLimit((n) => Math.min(n + GALLERY_PAGE_SIZE, photos.length));
        }
      },
      { rootMargin: '600px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [limit, photos.length]);

  if (photos.length === 0) {
    return (
      <p className={styles.empty}>
        Żadne zdjęcie nie pasuje do wybranych filtrów. Zmień filtry albo je wyczyść.
      </p>
    );
  }

  return (
    <>
      <ul className={styles.grid}>
        {photos.slice(0, limit).map((photo) => (
          <li key={photo.id}>
            <PhotoCard
              photo={photo}
              myRating={myRatings[photo.id]}
              stats={statsFor(stats, photo.id)}
              commentCount={commentCounts.get(photo.id) ?? 0}
              favorite={myFavorites[photo.id] === true}
              showStars={showStars}
              revealAverage={revealAverage}
              onOpen={() => onOpen(photo.id)}
              onRate={(value) => onRate(photo.id, value)}
              onToggleFavorite={() => onToggleFavorite(photo.id)}
            />
          </li>
        ))}
      </ul>

      {limit < photos.length && (
        <div ref={sentinel} className={styles.more}>
          <button
            type="button"
            className={styles.moreButton}
            onClick={() => setLimit((n) => Math.min(n + GALLERY_PAGE_SIZE, photos.length))}
          >
            Pokaż więcej ({photos.length - limit} pozostało)
          </button>
        </div>
      )}
    </>
  );
}
