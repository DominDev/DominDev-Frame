/**
 * Przetwarzanie zdjęć źródłowych na warianty wysyłane do Firebase Storage.
 *
 *   npm run photos:prepare            przetwarza tylko nowe pliki
 *   npm run photos:prepare -- --force przetwarza wszystko od nowa
 *
 * Czyta `_source/` (rekurencyjnie), zapisuje do `_processed/`:
 *   thumb/{id}.webp   miniatura do siatki galerii
 *   full/{id}.webp    wersja do podglądu i do lupki
 *   manifest.json     lista zdjęć dla skryptu wysyłającego
 *   mapping.csv       nazwa pliku > pełna ścieżka źródłowa
 *
 * Oryginały są wyłącznie czytane.
 */

import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, extname, relative, dirname } from 'node:path';
import { cpus } from 'node:os';
import sharp from 'sharp';
import { photoId, collisionSuffix } from './lib/photo-id.mjs';

// --- Ustawienia ------------------------------------------------------------

const SOURCE_DIR = '_source';
const OUT_DIR = '_processed';

/**
 * Jakość celowo wysoka. Rodzina ocenia ostrość i jakość kadru, więc artefakty
 * kompresji mogłyby przekłamać decyzję, do której podjęcia to narzędzie służy.
 * Przy darmowym progu 5 GB koszt tej ostrożności jest zerowy.
 */
const FULL = { maxWidth: 2560, quality: 94, effort: 6 };

/** 640 px zamiast 400, żeby kafelki były ostre na ekranach HiDPI. */
const THUMB = { width: 640, quality: 78, effort: 6 };

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']);
const CONCURRENCY = Math.max(2, Math.min(8, cpus().length));

const force = process.argv.includes('--force');

// --- Zbieranie plików ------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`Brak katalogu ${SOURCE_DIR}/. Wrzuc do niego zdjecia z sesji.`);
  process.exit(1);
}

const files = walk(SOURCE_DIR).sort();

if (files.length === 0) {
  console.error(`Katalog ${SOURCE_DIR}/ nie zawiera zdjec.`);
  process.exit(1);
}

console.log(`\nZnaleziono plikow: ${files.length}\n`);

// --- Kontrole spójności ----------------------------------------------------
//
// Raport dla admina identyfikuje zdjecia po nazwie pliku, wiec dwie rozne
// fotografie o tej samej nazwie uczynilyby raport bezuzytecznym. To jedyny
// przypadek, ktory przerywa prace.

const byDisplayName = new Map();
const problems = [];

for (const path of files) {
  const fileName = path.split(/[\\/]/).pop();
  const key = fileName.toLowerCase();
  if (byDisplayName.has(key)) {
    problems.push(`  "${fileName}" wystepuje w dwoch miejscach:\n    ${byDisplayName.get(key)}\n    ${path}`);
  } else {
    byDisplayName.set(key, path);
  }
}

if (problems.length) {
  console.error('PRZERWANO: duplikaty nazw plikow (porownanie ignoruje wielkosc liter,');
  console.error('bo Windows tez jej nie odroznia przy wyszukiwaniu).\n');
  console.error(problems.join('\n\n'));
  console.error('\nZmien nazwy tak, zeby byly unikalne, i uruchom skrypt ponownie.');
  process.exit(1);
}

// --- Budowa listy zadań ----------------------------------------------------

const usedIds = new Map();
const items = [];

for (const path of files) {
  const fileName = path.split(/[\\/]/).pop();
  const rel = relative(SOURCE_DIR, path);
  let id = photoId(fileName);

  if (usedIds.has(id)) {
    const suffixed = `${id}__${collisionSuffix(rel)}`;
    console.warn(`  uwaga: kolizja id "${id}", uzywam "${suffixed}"`);
    id = suffixed;
  }
  usedIds.set(id, rel);

  items.push({ id, name: fileName, src: path, rel });
}

mkdirSync(join(OUT_DIR, 'thumb'), { recursive: true });
mkdirSync(join(OUT_DIR, 'full'), { recursive: true });

// --- Przetwarzanie ---------------------------------------------------------

let done = 0;
let skipped = 0;
let bytesThumb = 0;
let bytesFull = 0;

async function processOne(item) {
  const fullPath = join(OUT_DIR, 'full', `${item.id}.webp`);
  const thumbPath = join(OUT_DIR, 'thumb', `${item.id}.webp`);

  if (!force && existsSync(fullPath) && existsSync(thumbPath)) {
    const meta = await sharp(fullPath).metadata();
    item.w = meta.width;
    item.h = meta.height;
    bytesFull += statSync(fullPath).size;
    bytesThumb += statSync(thumbPath).size;
    skipped++;
    return;
  }

  // `flatten` usuwa kanal alfa (zrodla sa w pelni nieprzezroczyste, wiec nic
  // sie nie zmienia wizualnie, a plik jest mniejszy). Sharp domyslnie nie
  // przepisuje metadanych, wiec EXIF i tak nie trafia do wyniku.
  const base = sharp(item.src).flatten({ background: '#000000' });

  const fullBuf = await base
    .clone()
    .resize({ width: FULL.maxWidth, withoutEnlargement: true })
    .webp({ quality: FULL.quality, effort: FULL.effort })
    .toBuffer({ resolveWithObject: true });

  const thumbBuf = await base
    .clone()
    .resize({ width: THUMB.width, withoutEnlargement: true })
    .webp({ quality: THUMB.quality, effort: THUMB.effort })
    .toBuffer();

  writeFileSync(fullPath, fullBuf.data);
  writeFileSync(thumbPath, thumbBuf);

  item.w = fullBuf.info.width;
  item.h = fullBuf.info.height;
  bytesFull += fullBuf.data.length;
  bytesThumb += thumbBuf.length;
  done++;
}

async function runPool(tasks, limit) {
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < tasks.length) {
      const i = index++;
      await processOne(tasks[i]);
      const n = done + skipped;
      if (n % 50 === 0 || n === tasks.length) {
        console.log(`  ${String(n).padStart(4)} / ${tasks.length}`);
      }
    }
  });
  await Promise.all(workers);
}

const started = Date.now();
console.log(`Przetwarzanie (${CONCURRENCY} rownolegle)${force ? ', tryb --force' : ''}:`);
await runPool(items, CONCURRENCY);

// --- Zapis manifestu i mapowania -------------------------------------------

const manifest = items.map(({ id, name, w, h }) => ({ id, name, w, h }));
writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

const csv = [
  'nazwa_pliku,sciezka_zrodlowa,id',
  ...items.map((i) => `"${i.name}","${i.rel.replace(/"/g, '""')}","${i.id}"`),
].join('\r\n');
writeFileSync(join(OUT_DIR, 'mapping.csv'), '﻿' + csv, 'utf8');

// --- Podsumowanie ----------------------------------------------------------

const mb = (b) => (b / 1024 / 1024).toFixed(1);
const secs = ((Date.now() - started) / 1000).toFixed(0);

console.log('');
console.log(`Przetworzono:   ${done}`);
console.log(`Pominieto:      ${skipped} (juz istnialy, uzyj --force zeby nadpisac)`);
console.log(`Miniatury:      ${mb(bytesThumb)} MB`);
console.log(`Wersje pelne:   ${mb(bytesFull)} MB`);
console.log(`Razem:          ${mb(bytesThumb + bytesFull)} MB`);
console.log(`Czas:           ${secs} s`);
console.log('');
console.log(`Manifest:       ${join(OUT_DIR, 'manifest.json')}`);
console.log(`Mapowanie:      ${join(OUT_DIR, 'mapping.csv')}`);
console.log('');
console.log('Nastepny krok:  npm run photos:upload');
console.log('');
