/**
 * Sprawdza mapowanie i przygotowuje warianty WebP zdjęć po obróbce.
 *
 *   npm run photos:edited:check -- --source "D:\Photos\DominDev-Frame"
 *   npm run photos:edited:prepare -- --source "D:\Photos\DominDev-Frame"
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { extname, join } from 'node:path';
import sharp from 'sharp';
import { mapEditedFiles, mappingCsv } from './lib/edited-photos.mjs';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']);
const FULL = { maxWidth: 2560, quality: 94, effort: 6 };
const THUMB = { width: 640, quality: 78, effort: 6 };
const CONCURRENCY = Math.max(2, Math.min(8, cpus().length));

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Opcja ${name} wymaga wartości.`);
  return value;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (IMAGE_EXT.has(extname(entry.name).toLowerCase())) out.push(path);
  }
  return out;
}

const sourceDir = option('--source', '_edited_source');
const outputDir = option('--output', '_processed_edited');
const manifestPath = option('--manifest', join('_processed', 'manifest.json'));
const checkOnly = process.argv.includes('--check');
const force = process.argv.includes('--force');

if (!existsSync(sourceDir)) throw new Error(`Brak katalogu ze zdjęciami po obróbce: ${sourceDir}`);
if (!existsSync(manifestPath)) throw new Error(`Brak manifestu zdjęć źródłowych: ${manifestPath}`);

const paths = walk(sourceDir).sort();
if (paths.length === 0) throw new Error(`Katalog ${sourceDir} nie zawiera obsługiwanych zdjęć.`);

const originals = JSON.parse(readFileSync(manifestPath, 'utf8'));
const names = paths.map((path) => path.split(/[\\/]/).pop());
const pathByName = new Map(names.map((name, index) => [name, paths[index]]));
const { mapped, problems } = mapEditedFiles(names, originals);

if (problems.length > 0) {
  console.error('\nPRZERWANO: mapowanie wymaga poprawy.\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`\nŹródło:    ${sourceDir}`);
console.log(`Manifest:  ${manifestPath}`);
console.log(`Dopasowano: ${mapped.length}\n`);

for (const item of mapped) {
  const meta = await sharp(pathByName.get(item.editedName)).metadata();
  item.sourceW = meta.width;
  item.sourceH = meta.height;
  console.log(
    `  [ok] ${item.editedName} -> ${item.originalName} -> ${item.photoId}` +
      `  (${meta.width} x ${meta.height}, ${item.method})`
  );
}

if (checkOnly) {
  console.log('\nTryb kontrolny: nie utworzono plików i niczego nie wysłano.\n');
  process.exit(0);
}

mkdirSync(join(outputDir, 'thumb'), { recursive: true });
mkdirSync(join(outputDir, 'full'), { recursive: true });

let index = 0;
let processed = 0;
let skipped = 0;

async function processOne(item) {
  const sourcePath = pathByName.get(item.editedName);
  const fullPath = join(outputDir, 'full', `${item.photoId}.webp`);
  const thumbPath = join(outputDir, 'thumb', `${item.photoId}.webp`);

  if (!force && existsSync(fullPath) && existsSync(thumbPath)) {
    const meta = await sharp(fullPath).metadata();
    item.w = meta.width;
    item.h = meta.height;
    skipped++;
    return;
  }

  const base = sharp(sourcePath).rotate().flatten({ background: '#000000' });
  const full = await base
    .clone()
    .resize({ width: FULL.maxWidth, withoutEnlargement: true })
    .webp({ quality: FULL.quality, effort: FULL.effort })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: THUMB.width, withoutEnlargement: true })
    .webp({ quality: THUMB.quality, effort: THUMB.effort })
    .toBuffer();

  writeFileSync(fullPath, full.data);
  writeFileSync(thumbPath, thumb);
  item.w = full.info.width;
  item.h = full.info.height;
  processed++;
}

await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (index < mapped.length) await processOne(mapped[index++]);
  })
);

const manifest = mapped.map(({ photoId, originalName, editedName, w, h }) => ({
  photoId,
  originalName,
  editedName,
  w,
  h,
}));

writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeFileSync(join(outputDir, 'mapping.csv'), mappingCsv(mapped), 'utf8');

const totalBytes = ['thumb', 'full'].reduce(
  (sum, variant) =>
    sum + manifest.reduce((part, photo) => part + statSync(join(outputDir, variant, `${photo.photoId}.webp`)).size, 0),
  0
);

console.log(`\nPrzetworzono: ${processed}`);
console.log(`Pominięto:    ${skipped}`);
console.log(`Rozmiar:      ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`Manifest:     ${join(outputDir, 'manifest.json')}`);
console.log('Następny krok wykonaj dopiero po akceptacji mapowania.\n');
