import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const component = readFileSync('src/components/gallery/FilterBar.tsx', 'utf8');
const styles = readFileSync('src/components/gallery/FilterBar.module.css', 'utf8');

test('filtr Obrobione korzysta z tej samej listy na desktopie i mobile', () => {
  assert.match(component, /key: 'edited', label: 'Obrobione'/);
  assert.equal(component.match(/TABS\.map/g)?.length, 2);
  assert.match(component, /Pokaż: \$\{tab\.label\} \(\$\{counts\[tab\.key\]\}\)/);
});

test('dokładniejsze filtry są kontrolowane jednym czytelnym przyciskiem', () => {
  assert.match(component, /<span>Więcej filtrów<\/span>/);
  assert.match(component, /hidden=\{!advancedOpen\}/);
  assert.match(component, /aria-expanded=\{advancedOpen\}/);
  assert.match(component, /aktywne: \$\{activeAdvanced\}/);
});

test('mobile zastępuje przyciski kategorii pełnoszeroką listą Pokaż', () => {
  const mobile = styles.slice(styles.indexOf('@media (max-width: 720px)'));
  assert.match(mobile, /\.tabs\s*\{[^}]*display:\s*none/s);
  assert.match(mobile, /\.mobileTab\s*\{[^}]*display:\s*block[^}]*width:\s*100%/s);
  assert.match(mobile, /\.mobileTab select\s*\{[^}]*width:\s*100%/s);
  assert.match(mobile, /\.advancedToggle\s*\{[^}]*width:\s*100%/s);
});
