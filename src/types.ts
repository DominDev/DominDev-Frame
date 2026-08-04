/** Wspólne typy domenowe aplikacji. */

/** Pozycja manifestu. `name` to dokładna nazwa pliku źródłowego, pokazywana wszędzie. */
export interface Photo {
  id: string;
  name: string;
  w: number;
  h: number;
  /** Tokeny pobierania - klucze na okaziciela do plików w Storage. */
  tThumb: string;
  tFull: string;
}

export type Rating = 1 | 2 | 3 | 4 | 5;

/** uid > (id zdjęcia > ocena) */
export type RatingsByUser = Record<string, Record<string, Rating>>;

/** uid > (id zdjęcia > true) */
export type FavoritesByUser = Record<string, Record<string, true>>;

export interface Comment {
  id: string;
  photoId: string;
  uid: string;
  text: string;
  /** `null` przez chwilę po dodaniu, zanim serwer nada znacznik czasu. */
  createdAt: Date | null;
  editedAt: Date | null;
}
