/**
 * Ustalenie, co pokazać w podglądzie pełnoekranowym.
 *
 * Logika wygląda na drobiazg, a potrafi zablokować aplikację na trwałe, bo
 * adres z otwartym zdjęciem przeżywa odświeżenie strony. Dlatego jest tutaj,
 * jako czysta funkcja z testem, a nie wpleciona w renderowanie komponentu.
 */

import type { Photo } from '../types';

export interface ViewerResolution {
  /** Lista, po której nawigują strzałki. */
  photos: Photo[];
  /** Pozycja otwartego zdjęcia albo -1, gdy podgląd ma być zamknięty. */
  index: number;
  /** Lista do zapamiętania na czas otwarcia podglądu (`null` = nie zamrażaj jeszcze). */
  freeze: Photo[] | null;
  /** Adres wskazuje na zdjęcie, którego nie ma - trzeba go wyczyścić. */
  stale: boolean;
}

export interface ViewerInput {
  /** Zdjęcie z adresu. */
  photoId: string | null;
  /** Lista zamrożona przy otwarciu podglądu. */
  frozen: Photo[] | null;
  /** Bieżący wynik filtrowania. */
  selected: Photo[];
  /** Pełna lista zdjęć z manifestu. */
  all: Photo[];
}

export function resolveViewer({ photoId, frozen, selected, all }: ViewerInput): ViewerResolution {
  if (photoId === null) {
    return { photos: selected, index: -1, freeze: null, stale: false };
  }

  // Zamrażamy dopiero, gdy jest co zamrozić. Przy pierwszym renderowaniu po
  // odświeżeniu strony lista jest jeszcze pusta, a zamrożona pustka nie
  // odmroziłaby się nigdy: odmrożenie następuje przy zamknięciu podglądu,
  // którego nie dałoby się otworzyć.
  const freeze = frozen ?? (selected.length > 0 ? selected : null);
  const photos = freeze ?? selected;

  const index = photos.findIndex((p) => p.id === photoId);
  if (index >= 0) return { photos, index, freeze, stale: false };

  // Zdjęcie wypadło z bieżących filtrów - na przykład po wejściu z linku.
  // Lepiej pokazać je na tle pełnej listy niż zostawić pusty ekran.
  const fallback = all.findIndex((p) => p.id === photoId);
  if (fallback >= 0) return { photos: all, index: fallback, freeze, stale: false };

  // Dane jeszcze się wczytują - nie przesądzamy, że zdjęcia nie ma.
  if (all.length === 0) return { photos, index: -1, freeze, stale: false };

  return { photos, index: -1, freeze, stale: true };
}
