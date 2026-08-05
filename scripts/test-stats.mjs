import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FILTERS,
  computeStats,
  countComments,
  formatAvg,
  latestCommentAt,
  ratedCount,
  selectPhotos,
  votesLabel,
} from '../src/lib/stats.ts';

const photo = (id, name = `${id}.png`) => ({ id, name, w: 1920, h: 1152, tThumb: 't', tFull: 'f' });
const photos = [photo('ten', '10.png'), photo('two', '2.png'), photo('alpha', 'alpha.png')];
const ratings = {
  u1: { ten: 5, two: 2 },
  u2: { ten: 3, alpha: 5 },
};
const stats = computeStats(ratings);

const baseInput = {
  photos,
  filters: DEFAULT_FILTERS,
  myRatings: ratings.u1,
  myFavorites: { alpha: true },
  stats,
  commentCounts: new Map([['two', 2]]),
  latestComment: new Map([['two', 200], ['alpha', 100]]),
};

test('statystyki liczą sumę, liczbę głosów i średnią', () => {
  assert.deepEqual(stats.get('ten'), { sum: 8, count: 2, avg: 4 });
  assert.deepEqual(stats.get('two'), { sum: 2, count: 1, avg: 2 });
  assert.equal(stats.get('missing'), undefined);
});

test('domyślne sortowanie nazw jest naturalne', () => {
  assert.deepEqual(selectPhotos(baseInput).map((item) => item.name), ['2.png', '10.png', 'alpha.png']);
});

test('wyszukiwanie znajduje dowolny fragment nazwy bez rozróżniania wielkości liter', () => {
  const result = selectPhotos({
    ...baseInput,
    filters: { ...DEFAULT_FILTERS, query: '  PHA  ' },
  });
  assert.deepEqual(result.map((item) => item.name), ['alpha.png']);
});

test('wyszukiwanie można łączyć z pozostałymi filtrami', () => {
  const result = selectPhotos({
    ...baseInput,
    filters: { ...DEFAULT_FILTERS, query: 'alpha', tab: 'favorites', avg: 'min45' },
  });
  assert.deepEqual(result.map((item) => item.name), ['alpha.png']);
});

test('szybkie filtry wybierają nieocenione, ulubione i skomentowane', () => {
  const ids = (tab) => selectPhotos({ ...baseInput, filters: { ...DEFAULT_FILTERS, tab } }).map((p) => p.id);
  assert.deepEqual(ids('unrated'), ['alpha']);
  assert.deepEqual(ids('favorites'), ['alpha']);
  assert.deepEqual(ids('commented'), ['two']);
});

test('filtry własnej oceny i średniej można łączyć', () => {
  const result = selectPhotos({
    ...baseInput,
    filters: { ...DEFAULT_FILTERS, myStars: 'exactly5', avg: 'min4' },
  });
  assert.deepEqual(result.map((p) => p.id), ['ten']);
});

test('sortowanie po średniej i liczbie głosów ma stabilne rozstrzygnięcia', () => {
  const byAverage = selectPhotos({ ...baseInput, filters: { ...DEFAULT_FILTERS, sort: 'avg' } });
  assert.deepEqual(byAverage.map((p) => p.id), ['alpha', 'ten', 'two']);
  const byVotes = selectPhotos({ ...baseInput, filters: { ...DEFAULT_FILTERS, sort: 'votes' } });
  assert.deepEqual(byVotes.map((p) => p.id), ['ten', 'two', 'alpha']);
});

test('sortowanie po komentarzach uwzględnia datę, liczbę i nazwę', () => {
  const result = selectPhotos({ ...baseInput, filters: { ...DEFAULT_FILTERS, sort: 'comment' } });
  assert.deepEqual(result.map((p) => p.id), ['two', 'alpha', 'ten']);
});

test('liczniki komentarzy i najnowsze daty są obliczane per zdjęcie', () => {
  const comments = [
    { id: '1', photoId: 'two', uid: 'u1', text: 'a', createdAt: new Date(100), editedAt: null },
    { id: '2', photoId: 'two', uid: 'u2', text: 'b', createdAt: new Date(300), editedAt: null },
    { id: '3', photoId: 'ten', uid: 'u1', text: 'c', createdAt: null, editedAt: null },
  ];
  assert.equal(countComments(comments).get('two'), 2);
  assert.equal(latestCommentAt(comments).get('two'), 300);
  assert.equal(latestCommentAt(comments).get('ten'), undefined);
});

test('formatowanie raportów używa polskiego przecinka i odmiany słowa głos', () => {
  assert.equal(formatAvg(4.25), '4,3');
  assert.equal(formatAvg(null), '-');
  assert.equal(votesLabel(1), '1 głos');
  assert.equal(votesLabel(2), '2 głosy');
  assert.equal(votesLabel(5), '5 głosów');
  assert.equal(votesLabel(12), '12 głosów');
  assert.equal(ratedCount(ratings.u1), 2);
  assert.equal(ratedCount(undefined), 0);
});
