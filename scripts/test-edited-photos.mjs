import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapEditedFiles, mappingCsv, mergeEditedPhotos } from './lib/edited-photos.mjs';

const originals = [
  { id: 'one_png', name: 'ONE.png' },
  { id: 'two_png', name: 'two.png' },
  { id: 'same_png', name: 'same.png' },
  { id: 'same_jpg', name: 'same.jpg' },
];

test('mapowanie preferuje dokładną nazwę i zachowuje photoId', () => {
  const result = mapEditedFiles(['ONE.png'], originals);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.mapped[0], {
    editedName: 'ONE.png',
    originalName: 'ONE.png',
    photoId: 'one_png',
    method: 'exact',
  });
});

test('mapowanie dopuszcza zmianę rozszerzenia przy jednoznacznym rdzeniu', () => {
  const result = mapEditedFiles(['two.jpg'], originals);
  assert.deepEqual(result.problems, []);
  assert.equal(result.mapped[0].photoId, 'two_png');
  assert.equal(result.mapped[0].method, 'stem');
});

test('mapowanie zatrzymuje niejednoznaczny rdzeń i nieznaną nazwę', () => {
  const result = mapEditedFiles(['same.webp', 'missing.png'], originals);
  assert.equal(result.mapped.length, 0);
  assert.equal(result.problems.length, 2);
});

test('dwa pliki po obróbce nie mogą wskazywać jednego zdjęcia', () => {
  const result = mapEditedFiles(['two.jpg', 'two.webp'], originals);
  assert.equal(result.mapped.length, 1);
  assert.match(result.problems[0], /Dwa pliki/);
});

test('scalanie zachowuje wcześniejsze wpisy i zastępuje wskazane ID', () => {
  const existing = [
    { photoId: 'a', originalName: 'a.png', token: 'old-a' },
    { photoId: 'b', originalName: 'b.png', token: 'old-b' },
  ];
  const incoming = [{ photoId: 'a', originalName: 'a.png', token: 'new-a' }];
  assert.deepEqual(mergeEditedPhotos(existing, incoming), [
    { photoId: 'a', originalName: 'a.png', token: 'new-a' },
    { photoId: 'b', originalName: 'b.png', token: 'old-b' },
  ]);
});

test('CSV mapowania ma BOM i zapisuje metodę dopasowania', () => {
  const csv = mappingCsv([
    { editedName: 'two.jpg', originalName: 'two.png', photoId: 'two_png', method: 'stem' },
  ]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /"two.jpg","two.png","two_png","stem"/);
});
