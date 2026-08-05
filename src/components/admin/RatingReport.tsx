import { useMemo, useState } from 'react';
import type { Photo, RatingsByUser } from '../../types';
import type { PhotoStats } from '../../lib/stats';
import { formatAvg, statsFor } from '../../lib/stats';
import { compareNames } from '../../lib/sort';
import { USERS, USER_UIDS } from '../../config/users';
import { copyToClipboard, downloadFile, timestampForFileName, toCsv } from '../../lib/csv';
import styles from './Admin.module.css';

interface Props {
  photos: Photo[];
  ratings: RatingsByUser;
  stats: Map<string, PhotoStats>;
}

/**
 * Raport ocen: to jest właściwy produkt całej aplikacji. Po nim admin wie,
 * które pliki wyciągnąć z dysku do obróbki.
 */
export function RatingReport({ photos, ratings, stats }: Props) {
  const [copied, setCopied] = useState(false);
  const [minVotes, setMinVotes] = useState(1);

  const rows = useMemo(() => {
    return photos
      .map((p) => ({ photo: p, stats: statsFor(stats, p.id) }))
      .filter((r) => r.stats.count >= minVotes)
      .sort((a, b) => {
        const av = a.stats.avg;
        const bv = b.stats.avg;
        if (av === null && bv === null) return compareNames(a.photo.name, b.photo.name);
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av || b.stats.count - a.stats.count || compareNames(a.photo.name, b.photo.name);
      });
  }, [photos, stats, minVotes]);

  function exportCsv() {
    const header = ['Nazwa pliku', 'Srednia', 'Liczba ocen', ...USER_UIDS.map((u) => USERS[u].name)];
    const body = rows.map((r) => [
      r.photo.name,
      r.stats.avg === null ? '' : formatAvg(r.stats.avg),
      r.stats.count,
      ...USER_UIDS.map((u) => ratings[u]?.[r.photo.id] ?? ''),
    ]);
    downloadFile(`frame-oceny_${timestampForFileName()}.csv`, toCsv([header, ...body]));
  }

  async function copyNames() {
    if (await copyToClipboard(rows.map((r) => r.photo.name).join('\r\n'))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.title}>Raport ocen</h2>

        <div className={styles.actions}>
          <label className={styles.inlineLabel}>
            Minimum ocen
            <select value={minVotes} onChange={(e) => setMinVotes(Number(e.target.value))}>
              <option value={0}>wszystkie, także bez ocen</option>
              <option value={1}>co najmniej 1</option>
              <option value={3}>co najmniej 3</option>
              <option value={5}>wszyscy pięcioro</option>
            </select>
          </label>

          <button
            type="button"
            className={styles.button}
            disabled={rows.length === 0}
            onClick={copyNames}
          >
            {copied ? 'Skopiowano' : `Kopiuj nazwy (${rows.length})`}
          </button>
          <button
            type="button"
            className={styles.buttonPrimary}
            disabled={rows.length === 0}
            onClick={exportCsv}
          >
            Eksport CSV
          </button>
        </div>
      </div>

      <p className={styles.hint}>
        Posortowane od najwyższej średniej. Przycisk kopiowania wkłada do schowka samą listę
        nazw plików, po jednej w wierszu - gotową do wklejenia w wyszukiwarkę plików.
      </p>

      {rows.length === 0 ? (
        <p className={styles.emptyReport} role="status">
          Brak zdjęć spełniających wybrane minimum ocen. Wybierz niższy próg, żeby zobaczyć
          wyniki.
        </p>
      ) : (
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Przewijana tabela raportu ocen"
          tabIndex={0}
        >
          <table className={styles.table}>
          <caption className="visuallyHidden">
            Zdjęcia posortowane według średniej oceny wraz z ocenami członków rodziny
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Nazwa pliku</th>
              <th scope="col">Średnia</th>
              <th scope="col">Ocen</th>
              {USER_UIDS.map((uid) => (
                <th key={uid} scope="col">
                  {USERS[uid].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.photo.id}>
                <td className={styles.numeric}>{i + 1}</td>
                <td className={styles.fileName}>{r.photo.name}</td>
                <td className={styles.numeric}>
                  <strong>{formatAvg(r.stats.avg)}</strong>
                </td>
                <td className={styles.numeric}>{r.stats.count}</td>
                {USER_UIDS.map((uid) => (
                  <td key={uid} className={styles.numeric}>
                    {ratings[uid]?.[r.photo.id] ?? <span className={styles.dash}>-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
