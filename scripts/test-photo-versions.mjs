import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePhotoVersion } from '../src/lib/photo-versions.ts';

const photo = { id: 'one_png', name: 'one.png', w: 1920, h: 1152, tThumb: 'a', tFull: 'b' };
const edited = {
  photoId: 'one_png',
  originalName: 'one.png',
  editedName: 'one.png',
  w: 1023,
  h: 1537,
  tThumb: 'c',
  tFull: 'd',
  updatedAt: '2026-08-07T00:00:00.000Z',
};

test('podgląd zaczyna od wersji przed obróbką', () => {
  assert.deepEqual(resolvePhotoVersion(photo, edited, null), {
    kind: 'original',
    width: 1920,
    height: 1152,
    edited: null,
  });
});

test('żądanie wersji po obróbce zwraca jej proporcje', () => {
  assert.deepEqual(resolvePhotoVersion(photo, edited, photo.id), {
    kind: 'edited',
    width: 1023,
    height: 1537,
    edited,
  });
});

test('przejście do innego zdjęcia automatycznie wraca do wersji źródłowej', () => {
  const next = { ...photo, id: 'two_png', name: 'two.png' };
  assert.equal(resolvePhotoVersion(next, { ...edited, photoId: next.id }, photo.id).kind, 'original');
});

test('brak obróbki zawsze bezpiecznie pokazuje zdjęcie źródłowe', () => {
  assert.equal(resolvePhotoVersion(photo, undefined, photo.id).kind, 'original');
});
