/**
 * Wyznaczanie identyfikatora zdjęcia z nazwy pliku.
 *
 * REGUŁA NADRZĘDNA: `id` zależy wyłącznie od samego pliku, nigdy od reszty zbioru.
 *
 * Dlatego rozszerzenie doklejane jest ZAWSZE, a nie dopiero przy wykrytej kolizji.
 * Wariant warunkowy ma ukrytą wadę: gdy w folderze jest sam IMG_001.png i dostaje
 * id "IMG_001", a tydzień później dochodzi IMG_001.jpg, obydwa potrzebują wtedy
 * rozszerzenia i istniejące zdjęcie zmienia identyfikator, gubiąc swoje oceny
 * i komentarze.
 *
 *   6U2A7358.png     -> 6U2A7358_png
 *   sesja.final.png  -> sesja_final_png
 *   IMG_001.png      -> IMG_001_png
 *   IMG_001.jpg      -> IMG_001_jpg
 */

import { createHash } from 'node:crypto';

/** Klucze map w Firestore nie mogą zawierać kropki ani ukośnika. */
const ILLEGAL = /[^A-Za-z0-9_-]/g;

/**
 * @param {string} fileName nazwa pliku z rozszerzeniem, np. "6U2A7358.png"
 * @returns {string} identyfikator, np. "6U2A7358_png"
 */
export function photoId(fileName) {
  const dot = fileName.lastIndexOf('.');
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot + 1) : 'bin';

  return `${base.replace(ILLEGAL, '_')}_${ext.replace(ILLEGAL, '_')}`;
}

/**
 * Awaryjny sufiks przy kolizji identyfikatorów. W praktyce nieosiągalny, bo
 * duplikat nazwy wyświetlanej przerywa pracę skryptu wcześniej. Zostaje jako
 * gałąź obronna na wypadek, gdyby duplikaty nazw kiedyś zostały dopuszczone.
 *
 * @param {string} relPath ścieżka względem katalogu źródłowego
 */
export function collisionSuffix(relPath) {
  return createHash('sha1').update(relPath).digest('hex').slice(0, 6);
}
