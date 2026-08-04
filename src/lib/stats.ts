/**
 * Czyste funkcje liczące statystyki, filtrujące i sortujące galerię.
 *
 * Bez Reacta i bez Firebase - dzięki temu logikę wyboru zdjęć da się sprawdzić
 * w izolacji, a komponenty zajmują się wyłącznie rysowaniem.
 */

import type { Comment, Photo, Rating, RatingsByUser } from '../types';
import { compareNames } from './sort';

export interface PhotoStats {
  /** Suma ocen. */
  sum: number;
  /** Ile osób oceniło. */
  count: number;
  /** Średnia albo `null`, gdy nikt jeszcze nie ocenił. */
  avg: number | null;
}

const EMPTY_STATS: PhotoStats = { sum: 0, count: 0, avg: null };

/** Statystyki dla wszystkich zdjęć naraz - jedno przejście po ocenach. */
export function computeStats(ratings: RatingsByUser): Map<string, PhotoStats> {
  const out = new Map<string, PhotoStats>();

  for (const byPhoto of Object.values(ratings)) {
    for (const [photoId, value] of Object.entries(byPhoto)) {
      const s = out.get(photoId) ?? { sum: 0, count: 0, avg: null };
      s.sum += value;
      s.count += 1;
      s.avg = s.sum / s.count;
      out.set(photoId, s);
    }
  }

  return out;
}

export const statsFor = (stats: Map<string, PhotoStats>, photoId: string): PhotoStats =>
  stats.get(photoId) ?? EMPTY_STATS;

/** Liczba komentarzy przypadająca na zdjęcie. */
export function countComments(comments: Comment[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of comments) out.set(c.photoId, (out.get(c.photoId) ?? 0) + 1);
  return out;
}

/** Czas najnowszego komentarza pod zdjęciem - potrzebny do sortowania. */
export function latestCommentAt(comments: Comment[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of comments) {
    const t = c.createdAt?.getTime() ?? 0;
    if (t > (out.get(c.photoId) ?? 0)) out.set(c.photoId, t);
  }
  return out;
}

// --- Filtry ----------------------------------------------------------------

export type Tab = 'all' | 'unrated' | 'favorites' | 'commented';
export type MyStarsFilter = 'any' | 'exactly5' | 'min4' | 'max3';
export type AvgFilter = 'any' | 'min45' | 'min4' | 'min3';
export type SortKey = 'name' | 'avg' | 'votes' | 'comment';

export interface Filters {
  tab: Tab;
  myStars: MyStarsFilter;
  avg: AvgFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  tab: 'all',
  myStars: 'any',
  avg: 'any',
  sort: 'name',
};

export const isDefaultFilters = (f: Filters): boolean =>
  f.tab === 'all' && f.myStars === 'any' && f.avg === 'any' && f.sort === 'name';

export interface GalleryInput {
  photos: Photo[];
  filters: Filters;
  myRatings: Record<string, Rating>;
  myFavorites: Record<string, true>;
  stats: Map<string, PhotoStats>;
  commentCounts: Map<string, number>;
  latestComment: Map<string, number>;
}

function matchesMyStars(filter: MyStarsFilter, mine: Rating | undefined): boolean {
  if (filter === 'any') return true;
  if (mine === undefined) return false;
  if (filter === 'exactly5') return mine === 5;
  if (filter === 'min4') return mine >= 4;
  return mine <= 3;
}

function matchesAvg(filter: AvgFilter, avg: number | null): boolean {
  if (filter === 'any') return true;
  if (avg === null) return false;
  if (filter === 'min45') return avg >= 4.5;
  if (filter === 'min4') return avg >= 4;
  return avg >= 3;
}

function matchesTab(tab: Tab, input: GalleryInput, photo: Photo): boolean {
  switch (tab) {
    case 'unrated':
      return input.myRatings[photo.id] === undefined;
    case 'favorites':
      return input.myFavorites[photo.id] === true;
    case 'commented':
      return (input.commentCounts.get(photo.id) ?? 0) > 0;
    default:
      return true;
  }
}

/** Filtruje i sortuje galerię zgodnie z bieżącymi ustawieniami. */
export function selectPhotos(input: GalleryInput): Photo[] {
  const { photos, filters, myRatings, stats, commentCounts, latestComment } = input;

  const filtered = photos.filter(
    (p) =>
      matchesTab(filters.tab, input, p) &&
      matchesMyStars(filters.myStars, myRatings[p.id]) &&
      matchesAvg(filters.avg, statsFor(stats, p.id).avg)
  );

  const byName = (a: Photo, b: Photo) => compareNames(a.name, b.name);

  switch (filters.sort) {
    case 'avg':
      // Zdjęcia bez ocen na koniec, żeby czoło listy było użyteczne.
      return filtered.sort((a, b) => {
        const av = statsFor(stats, a.id).avg;
        const bv = statsFor(stats, b.id).avg;
        if (av === null && bv === null) return byName(a, b);
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av || byName(a, b);
      });
    case 'votes':
      return filtered.sort(
        (a, b) => statsFor(stats, b.id).count - statsFor(stats, a.id).count || byName(a, b)
      );
    case 'comment':
      return filtered.sort(
        (a, b) =>
          (latestComment.get(b.id) ?? 0) - (latestComment.get(a.id) ?? 0) ||
          (commentCounts.get(b.id) ?? 0) - (commentCounts.get(a.id) ?? 0) ||
          byName(a, b)
      );
    default:
      return filtered.sort(byName);
  }
}

/** Ile zdjęć oceniła dana osoba. */
export const ratedCount = (ratings: Record<string, Rating> | undefined): number =>
  ratings ? Object.keys(ratings).length : 0;

/** Formatowanie średniej po polsku: przecinek dziesiętny, jedno miejsce. */
export const formatAvg = (avg: number | null): string =>
  avg === null ? '-' : avg.toFixed(1).replace('.', ',');

/** "3 głosy" / "1 głos" / "5 głosów" - polska odmiana wymaga trzech form. */
export function votesLabel(count: number): string {
  if (count === 1) return '1 głos';
  const mod10 = count % 10;
  const mod100 = count % 100;
  const few = mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14);
  return `${count} ${few ? 'głosy' : 'głosów'}`;
}
