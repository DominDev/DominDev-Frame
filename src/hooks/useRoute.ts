/**
 * Nawigacja oparta o hash w adresie.
 *
 * Hash zamiast ścieżek, bo GitHub Pages nie umie przepisywać nieznanych adresów
 * na index.html - wejście wprost na /DominDev-Frame/admin dałoby 404.
 *
 * Trzymanie w adresie także filtrów i otwartego zdjęcia daje dwie rzeczy:
 * przycisk Wstecz zamyka podgląd zamiast wychodzić z aplikacji (istotne na
 * telefonie), a odświeżenie strony nie gubi miejsca, w którym się było.
 *
 *   #/                              galeria
 *   #/admin                         panel admina
 *   #/photo/6U2A7358_png            galeria z otwartym podglądem
 *   #/?q=7358&tab=unrated           galeria z wyszukiwaniem i filtrami
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_FILTERS,
  type AvgFilter,
  type Filters,
  type MyStarsFilter,
  type SortKey,
  type Tab,
} from '../lib/stats';

export interface Route {
  view: 'gallery' | 'admin';
  photoId: string | null;
  filters: Filters;
}

const TABS: Tab[] = ['all', 'unrated', 'favorites', 'commented'];
const STARS: MyStarsFilter[] = ['any', 'exactly5', 'min4', 'max3'];
const AVGS: AvgFilter[] = ['any', 'min45', 'min4', 'min3'];
const SORTS: SortKey[] = ['name', 'avg', 'votes', 'comment'];

const pick = <T extends string>(allowed: T[], value: string | null, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  const params = new URLSearchParams(search);

  const filters: Filters = {
    query: (params.get('q') ?? '').slice(0, 100),
    tab: pick(TABS, params.get('tab'), DEFAULT_FILTERS.tab),
    myStars: pick(STARS, params.get('stars'), DEFAULT_FILTERS.myStars),
    avg: pick(AVGS, params.get('avg'), DEFAULT_FILTERS.avg),
    sort: pick(SORTS, params.get('sort'), DEFAULT_FILTERS.sort),
  };

  if (path === '/admin') return { view: 'admin', photoId: null, filters };

  const photo = path.match(/^\/photo\/(.+)$/);
  return {
    view: 'gallery',
    photoId: photo ? decodeURIComponent(photo[1]) : null,
    filters,
  };
}

function build(route: Route): string {
  const params = new URLSearchParams();
  const searchQuery = route.filters.query.trim();
  if (searchQuery) params.set('q', searchQuery);
  if (route.filters.tab !== DEFAULT_FILTERS.tab) params.set('tab', route.filters.tab);
  if (route.filters.myStars !== DEFAULT_FILTERS.myStars) params.set('stars', route.filters.myStars);
  if (route.filters.avg !== DEFAULT_FILTERS.avg) params.set('avg', route.filters.avg);
  if (route.filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', route.filters.sort);

  const path =
    route.view === 'admin'
      ? '/admin'
      : route.photoId
        ? `/photo/${encodeURIComponent(route.photoId)}`
        : '/';

  const query = params.toString();
  return `#${path}${query ? `?${query}` : ''}`;
}

export interface RouteApi extends Route {
  setFilters: (filters: Filters) => void;
  /** Filtry można zmienić razem z otwarciem zdjęcia - jednym wpisem do historii. */
  openPhoto: (photoId: string, filters?: Filters) => void;
  closePhoto: () => void;
  goTo: (view: 'gallery' | 'admin') => void;
}

export function useRoute(): RouteApi {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  // Bieżąca trasa w referencji, żeby funkcje nawigacyjne mogły mieć stabilną
  // tożsamość. Gdyby powstawały na nowo przy każdym renderowaniu, memoizacja
  // sześciuset kafelków przestałaby cokolwiek dawać, a efekty zależne od tych
  // funkcji uruchamiałyby się bez przerwy.
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route, replace: boolean) => {
    const hash = build(next);
    if (hash === window.location.hash) return;

    if (replace) {
      // Zmiana filtrów nie powinna zapychać historii - inaczej wyjście z
      // aplikacji wymagałoby dwudziestu naciśnięć Wstecz.
      window.history.replaceState(null, '', hash);
      setRoute(next);
    } else {
      window.location.hash = hash;
    }
  }, []);

  const setFilters = useCallback(
    (filters: Filters) => navigate({ ...routeRef.current, filters }, true),
    [navigate]
  );

  const openPhoto = useCallback(
    (photoId: string, filters?: Filters) =>
      navigate({ ...routeRef.current, photoId, filters: filters ?? routeRef.current.filters }, false),
    [navigate]
  );

  const closePhoto = useCallback(
    () => navigate({ ...routeRef.current, photoId: null }, false),
    [navigate]
  );

  const goTo = useCallback(
    (view: 'gallery' | 'admin') =>
      navigate({ ...routeRef.current, view, photoId: null }, false),
    [navigate]
  );

  return { ...route, setFilters, openPhoto, closePhoto, goTo };
}
