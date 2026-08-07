import { useRef, useState } from 'react';
import type { AvgFilter, Filters, MyStarsFilter, SortKey, Tab } from '../../lib/stats';
import { DEFAULT_FILTERS, isDefaultFilters } from '../../lib/stats';
import styles from './FilterBar.module.css';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  shown: number;
  total: number;
  counts: Record<Tab, number>;
  revealAverages?: boolean;
  onToggleReveal?: (value: boolean) => void;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'unrated', label: 'Nieocenione' },
  { key: 'favorites', label: 'Ulubione' },
  { key: 'commented', label: 'Skomentowane' },
  { key: 'edited', label: 'Obrobione' },
];

const STARS: { key: MyStarsFilter; label: string }[] = [
  { key: 'any', label: 'Moja ocena: dowolna' },
  { key: 'exactly5', label: 'Moja ocena: 5' },
  { key: 'min4', label: 'Moja ocena: 4 i więcej' },
  { key: 'max3', label: 'Moja ocena: 3 i mniej' },
];

const AVGS: { key: AvgFilter; label: string }[] = [
  { key: 'any', label: 'Średnia: dowolna' },
  { key: 'min45', label: 'Średnia: 4,5 i więcej' },
  { key: 'min4', label: 'Średnia: 4 i więcej' },
  { key: 'min3', label: 'Średnia: 3 i więcej' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Sortuj: nazwa pliku' },
  { key: 'avg', label: 'Sortuj: najwyższa średnia' },
  { key: 'votes', label: 'Sortuj: liczba ocen' },
  { key: 'comment', label: 'Sortuj: ostatni komentarz' },
];

export function FilterBar({
  filters,
  onChange,
  shown,
  total,
  counts,
  revealAverages,
  onToggleReveal,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });
  const clearSearch = () => {
    set('query', '');
    requestAnimationFrame(() => searchRef.current?.focus());
  };
  const activeAdvanced =
    Number(filters.myStars !== 'any') + Number(filters.avg !== 'any') + Number(filters.sort !== 'name');

  return (
    <div className={styles.root}>
      <div
        className={`${styles.search} ${filters.query ? styles.searchHasValue : ''}`}
        role="search"
      >
        <label htmlFor="gallery-photo-search" className="visuallyHidden">
          Szukaj zdjęcia po nazwie
        </label>
        <input
          id="gallery-photo-search"
          ref={searchRef}
          type="search"
          value={filters.query}
          placeholder="Wpisz nazwę lub jej fragment"
          maxLength={100}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="gallery-result-count"
          onChange={(event) => set('query', event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && filters.query) {
              event.preventDefault();
              clearSearch();
            }
          }}
        />
        {filters.query && (
          <button type="button" className={styles.searchClear} onClick={clearSearch}>
            Wyczyść
          </button>
        )}
      </div>

      <div className={styles.tabs} role="group" aria-label="Szybkie filtry">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.tab} ${filters.tab === t.key ? styles.active : ''}`}
            aria-pressed={filters.tab === t.key}
            onClick={() => set('tab', t.key)}
          >
            {t.label}
            <span className={styles.count}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <label className={styles.mobileTab}>
        <span className="visuallyHidden">Pokaż zdjęcia</span>
        <select
          aria-label="Pokaż zdjęcia"
          value={filters.tab}
          onChange={(event) => set('tab', event.target.value as Tab)}
        >
          {TABS.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {`Pokaż: ${tab.label} (${counts[tab.key]})`}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={styles.advancedToggle}
        aria-expanded={advancedOpen}
        aria-controls="gallery-advanced-filters"
        aria-label={`${advancedOpen ? 'Ukryj więcej filtrów' : 'Pokaż więcej filtrów'}${
          activeAdvanced > 0 ? `, aktywne: ${activeAdvanced}` : ''
        }`}
        onClick={() => setAdvancedOpen((value) => !value)}
      >
        <span>Więcej filtrów</span>
        {activeAdvanced > 0 && <span className={styles.count}>{activeAdvanced}</span>}
      </button>

      <div
        id="gallery-advanced-filters"
        className={styles.advanced}
        hidden={!advancedOpen}
      >
        <div className={styles.selects}>
          <select
            aria-label="Filtr własnej oceny"
            value={filters.myStars}
            onChange={(e) => set('myStars', e.target.value as MyStarsFilter)}
          >
            {STARS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtr średniej"
            value={filters.avg}
            onChange={(e) => set('avg', e.target.value as AvgFilter)}
          >
            {AVGS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Sortowanie"
            value={filters.sort}
            onChange={(e) => set('sort', e.target.value as SortKey)}
          >
            {SORTS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {onToggleReveal && (
          <label className={styles.adminOption}>
            <input
              type="checkbox"
              checked={revealAverages ?? false}
              onChange={(event) => onToggleReveal(event.target.checked)}
            />
            Admin: pokazuj średnie także przed własną oceną
          </label>
        )}
      </div>

      <div className={styles.status}>
        <span id="gallery-result-count" aria-live="polite">
          {shown === total ? `${total} zdjęć` : `${shown} z ${total}`}
        </span>
        {!isDefaultFilters(filters) && (
          <button type="button" className={styles.clear} onClick={() => onChange(DEFAULT_FILTERS)}>
            Wyczyść filtry
          </button>
        )}
      </div>
    </div>
  );
}
