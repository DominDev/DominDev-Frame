import type { Rating } from '../types';

/**
 * Opisy przy gwiazdkach. Bez nich każdy rozumiałby skalę inaczej, a przy pięciu
 * oceniających rozjazd interpretacji psuje średnią bardziej niż sama skala.
 */
export const RATING_LABELS: Record<Rating, string> = {
  1: 'odrzucam',
  2: 'raczej nie',
  3: 'możliwe',
  4: 'bardzo dobre',
  5: 'koniecznie wybierz',
};

export const RATING_VALUES: Rating[] = [1, 2, 3, 4, 5];

/** Limit z reguł Firestore. Front pilnuje go wcześniej, żeby dać czytelny komunikat. */
export const COMMENT_MAX_LENGTH = 1000;

/** Ile kafelków dokładać na raz. 594 kafelki naraz to ~3000 pól formularza. */
export const GALLERY_PAGE_SIZE = 100;

/** Ile kolejnych zdjęć pobierać z wyprzedzeniem w trybie skupienia. */
export const PREFETCH_AHEAD = 3;
