import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const magnifier = readFileSync('src/components/viewer/MagnifierImage.tsx', 'utf8');
const magnifierCss = readFileSync('src/components/viewer/MagnifierImage.module.css', 'utf8');
const viewer = readFileSync('src/components/viewer/PhotoViewer.tsx', 'utf8');
const panel = readFileSync('src/components/viewer/ViewerPanel.tsx', 'utf8');

const ruleBody = (source, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's'));
  assert.ok(match, `Brak reguły ${selector}`);
  return match[1];
};

test('widok dopasowany zawsze używa całego pola i object-fit contain', () => {
  const image = ruleBody(magnifierCss, '.image');
  const fitted = ruleBody(magnifierCss, '.viewport:not(.zoomed) .image');

  assert.match(image, /object-fit:\s*contain/);
  assert.match(fitted, /position:\s*absolute/);
  assert.match(fitted, /width:\s*100%/);
  assert.match(fitted, /height:\s*100%/);
});

test('wąski pionowy obraz pozostaje wyśrodkowany po powiększeniu', () => {
  const zoomedImage = ruleBody(magnifierCss, '.zoomed .image');
  assert.match(zoomedImage, /margin-inline:\s*auto/);
});

test('narzędzia obrazu zajmują osobny wiersz i nie są nakładką', () => {
  const root = ruleBody(magnifierCss, '.root');
  const controls = ruleBody(magnifierCss, '.controls');

  assert.match(root, /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto/);
  assert.doesNotMatch(controls, /position:\s*absolute/);
  assert.ok(magnifier.indexOf('className={`${styles.controls}') < magnifier.indexOf('ref={scrollRef}'));
});

test('wybór wersji znajduje się w panelu, poza obszarem zdjęcia', () => {
  assert.doesNotMatch(viewer, /styles\.versionToggle/);
  assert.match(panel, /Wersja zdjęcia/);
  assert.match(panel, /Przed obróbką/);
  assert.match(panel, /Po obróbce/);
  assert.match(panel, /aria-pressed/);
});
