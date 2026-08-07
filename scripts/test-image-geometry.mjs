import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  containedImageRect,
  sourcePointInContainedImage,
} from '../src/lib/image-geometry.ts';

const closeTo = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 0.0001, `${message}: ${actual} zamiast ${expected}`);
};

test('pionowy obraz po contain ma równe marginesy po bokach', () => {
  const rect = containedImageRect(1232, 952, 905, 1357);
  assert.ok(rect);

  closeTo(rect.height, 952, 'wysokość');
  closeTo(rect.width, (905 * 952) / 1357, 'szerokość');
  closeTo(rect.x, (1232 - rect.width) / 2, 'lewy margines');
  closeTo(rect.y, 0, 'górny margines');
});

test('punkt na pionowym obrazie trafia w ten sam fragment pliku źródłowego', () => {
  const rect = containedImageRect(1232, 952, 905, 1357);
  assert.ok(rect);

  const point = sourcePointInContainedImage(
    rect.x + rect.width * 0.25,
    rect.y + rect.height * 0.75,
    1232,
    952,
    905,
    1357
  );
  assert.ok(point);
  closeTo(point.x, 905 * 0.25, 'współrzędna X');
  closeTo(point.y, 1357 * 0.75, 'współrzędna Y');
});

test('lupa nie uruchamia się nad pustym marginesem pionowego obrazu', () => {
  assert.equal(sourcePointInContainedImage(100, 476, 1232, 952, 905, 1357), null);
});

test('poziomy obraz po contain uwzględnia puste marginesy u góry', () => {
  const rect = containedImageRect(1232, 952, 1920, 1152);
  assert.ok(rect);

  closeTo(rect.width, 1232, 'szerokość');
  closeTo(rect.height, (1152 * 1232) / 1920, 'wysokość');
  closeTo(rect.x, 0, 'lewy margines');
  closeTo(rect.y, (952 - rect.height) / 2, 'górny margines');

  const center = sourcePointInContainedImage(616, 476, 1232, 952, 1920, 1152);
  assert.ok(center);
  closeTo(center.x, 960, 'środek X');
  closeTo(center.y, 576, 'środek Y');
});

test('nieprawidłowe wymiary nie tworzą geometrii obrazu', () => {
  assert.equal(containedImageRect(0, 952, 905, 1357), null);
  assert.equal(sourcePointInContainedImage(0, 0, 1232, 952, 0, 1357), null);
});
