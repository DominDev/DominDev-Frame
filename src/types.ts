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

/** Opcjonalna wersja zdjęcia po obróbce, powiązana przez niezmienne `photoId`. */
export interface EditedPhoto {
  photoId: string;
  originalName: string;
  editedName: string;
  w: number;
  h: number;
  /** Tokeny dotyczą wyłącznie obiektów w `photos/edited/`. */
  tThumb: string;
  tFull: string;
  updatedAt: string;
}

/** id zdjęcia źródłowego > wersja po obróbce */
export type EditedPhotosById = Record<string, EditedPhoto>;

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
