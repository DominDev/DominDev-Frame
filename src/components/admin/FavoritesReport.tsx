import { useMemo, useState } from 'react';
import type { FavoritesByUser, Photo } from '../../types';
import { compareNames } from '../../lib/sort';
import { USERS, USER_UIDS } from '../../config/users';
import { copyToClipboard, downloadFile, timestampForFileName, toCsv } from '../../lib/csv';
import styles from './Admin.module.css';

interface Props {
  photos: Photo[];
  favorites: FavoritesByUser;
}

export function FavoritesReport({ photos, favorites }: Props) {
  const [onlyShared, setOnlyShared] = useState(false);
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    const byPhoto = new Map<string, string[]>();

    for (const uid of USER_UIDS) {
      for (const photoId of Object.keys(favorites[uid] ?? {})) {
        byPhoto.set(photoId, [...(byPhoto.get(photoId) ?? []), uid]);
      }
    }

    return photos
      .filter((p) => byPhoto.has(p.id))
      .map((p) => ({ photo: p, uids: byPhoto.get(p.id) ?? [] }))
      .filter((r) => !onlyShared || r.uids.length >= 2)
      .sort(
        (a, b) => b.uids.length - a.uids.length || compareNames(a.photo.name, b.photo.name)
      );
  }, [photos, favorites, onlyShared]);

  function exportCsv() {
    const header = ['Nazwa pliku', 'Liczba osob', 'Kto'];
    const body = rows.map((r) => [
      r.photo.name,
      r.uids.length,
      r.uids.map((u) => USERS[u]?.name ?? u).join(', '),
    ]);
    downloadFile(`frame-ulubione_${timestampForFileName()}.csv`, toCsv([header, ...body]));
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
        <h2 className={styles.title}>Raport ulubionych</h2>

        <div className={styles.actions}>
          <label className={styles.inlineLabel}>
            <input
              type="checkbox"
              checked={onlyShared}
              onChange={(e) => setOnlyShared(e.target.checked)}
            />
            Tylko wybrane przez co najmniej 2 osoby
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

      {rows.length === 0 ? (
        <p className={styles.hint}>
          {onlyShared
            ? 'Żadne zdjęcie nie zostało jeszcze wybrane przez dwie osoby.'
            : 'Nikt nie dodał jeszcze żadnego zdjęcia do ulubionych.'}
        </p>
      ) : (
        <div
          className={styles.tableWrap}
          role="region"
          aria-label="Przewijana tabela raportu ulubionych"
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption className="visuallyHidden">
              Zdjęcia dodane do ulubionych wraz z liczbą i nazwami wybierających osób
            </caption>
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Nazwa pliku</th>
                <th scope="col">Osób</th>
                <th scope="col">Kto wybrał</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.photo.id}>
                  <td className={styles.numeric}>{i + 1}</td>
                  <td className={styles.fileName}>{r.photo.name}</td>
                  <td className={styles.numeric}>{r.uids.length}</td>
                  <td>{r.uids.map((u) => USERS[u]?.name ?? u).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
