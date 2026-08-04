import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timestampForFileName, toCsv } from '../src/lib/csv.ts';

test('CSV ma BOM, polski separator i zakończenia wierszy zgodne z Excelem', () => {
  const csv = toCsv([
    ['Nazwa', 'Komentarz'],
    ['zdjęcie.png', 'zwykły tekst'],
  ]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv, '\uFEFFNazwa;Komentarz\r\nzdjęcie.png;zwykły tekst');
});

test('CSV poprawnie cytuje średniki, cudzysłowy i nowe linie', () => {
  const csv = toCsv([['a;b', 'powiedział "tak"', 'dwa\nwiersze']]);
  assert.equal(csv, '\uFEFF"a;b";"powiedział ""tak""";"dwa\nwiersze"');
});

test('znacznik czasu do nazwy pliku jest stabilny i sortowalny', () => {
  const date = new Date(2026, 7, 4, 9, 7);
  assert.equal(timestampForFileName(date), '2026-08-04_0907');
});
