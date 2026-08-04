/**
 * Testy logiki podglądu pełnoekranowego.
 *
 *   npm test
 *
 * Node uruchamia pliki TypeScript bezpośrednio, więc nie potrzeba tu żadnego
 * narzędzia do budowania ani biblioteki testowej.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveViewer } from '../src/lib/viewer.ts';

const photo = (id) => ({ id, name: `${id}.png`, w: 1920, h: 1152, tThumb: 't', tFull: 'f' });
const all = [photo('a'), photo('b'), photo('c')];

test('zamkniety podglad, gdy adres nie wskazuje zdjecia', () => {
  const r = resolveViewer({ photoId: null, frozen: null, selected: all, all });
  assert.equal(r.index, -1);
  assert.equal(r.freeze, null, 'zamkniecie podgladu odmraza liste');
});

test('otwarcie zamraza biezaca liste', () => {
  const selected = [photo('b'), photo('c')];
  const r = resolveViewer({ photoId: 'b', frozen: null, selected, all });
  assert.equal(r.index, 0);
  assert.deepEqual(r.freeze, selected);
});

test('zamrozona lista nie zmienia sie, gdy filtry wyrzuca ocenione zdjecie', () => {
  const frozen = [photo('a'), photo('b')];
  // Zdjecie "a" wypadlo z wynikow filtrowania, ale podglad ma po nim nawigowac.
  const r = resolveViewer({ photoId: 'a', frozen, selected: [photo('b')], all });
  assert.equal(r.index, 0);
  assert.deepEqual(r.photos, frozen);
});

test('REGRESJA: pusta lista przy starcie nie zostaje zamrozona', () => {
  // Odswiezenie strony z adresem #/photo/a: dane jeszcze sie nie wczytaly.
  const first = resolveViewer({ photoId: 'a', frozen: null, selected: [], all: [] });
  assert.equal(first.freeze, null, 'pustka nie moze zostac zamrozona');
  assert.equal(first.stale, false, 'brak danych to nie jest nieaktualny adres');

  // Dane doszly - podglad musi sie otworzyc.
  const second = resolveViewer({ photoId: 'a', frozen: first.freeze, selected: all, all });
  assert.equal(second.index, 0, 'po wczytaniu danych zdjecie musi byc widoczne');
});

test('zdjecie spoza filtrow pokazuje sie na tle pelnej listy', () => {
  const r = resolveViewer({ photoId: 'c', frozen: null, selected: [photo('a')], all });
  assert.equal(r.index, 2);
  assert.deepEqual(r.photos, all);
});

test('adres do nieistniejacego zdjecia jest oznaczony do wyczyszczenia', () => {
  const r = resolveViewer({ photoId: 'zzz', frozen: null, selected: all, all });
  assert.equal(r.index, -1);
  assert.equal(r.stale, true);
});

test('brak danych nie jest mylony z nieistniejacym zdjeciem', () => {
  const r = resolveViewer({ photoId: 'zzz', frozen: null, selected: [], all: [] });
  assert.equal(r.stale, false);
});
