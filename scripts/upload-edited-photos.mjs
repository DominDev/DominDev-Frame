/**
 * Wysyła przygotowane wersje po obróbce i scala je z istniejącym editedManifest.
 *
 *   npm run photos:edited:upload                tylko pokazuje plan
 *   npm run photos:edited:upload -- --confirm   wykonuje wysyłkę
 *   npm run photos:edited:upload -- --confirm --force
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { bucket, db, STORAGE_BUCKET } from './lib/admin.mjs';
import { mergeEditedPhotos } from './lib/edited-photos.mjs';

const outputDir = '_processed_edited';
const manifestPath = join(outputDir, 'manifest.json');
const originalManifestPath = join('_processed', 'manifest.json');
const chunkSize = 250;
const concurrency = 4;
const force = process.argv.includes('--force');
const confirmed = process.argv.includes('--confirm');

if (!existsSync(manifestPath)) {
  throw new Error(`Brak ${manifestPath}. Najpierw uruchom photos:edited:prepare.`);
}
if (!existsSync(originalManifestPath)) {
  throw new Error(`Brak ${originalManifestPath}. Nie można sprawdzić powiązań ze zdjęciami źródłowymi.`);
}

const photos = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (photos.length === 0) throw new Error('Manifest wersji po obróbce jest pusty.');

const originals = JSON.parse(readFileSync(originalManifestPath, 'utf8'));
const originalsById = new Map(originals.map((photo) => [photo.id, photo]));
const seenPhotoIds = new Set();
const preflightProblems = [];

for (const photo of photos) {
  const original = originalsById.get(photo.photoId);
  if (!original || original.name !== photo.originalName) {
    preflightProblems.push(
      `Nieprawidłowe powiązanie: ${photo.editedName} -> ${photo.originalName} -> ${photo.photoId}`
    );
  }
  if (seenPhotoIds.has(photo.photoId)) {
    preflightProblems.push(`Powtórzony identyfikator w manifeście: ${photo.photoId}`);
  }
  seenPhotoIds.add(photo.photoId);

  for (const variant of ['thumb', 'full']) {
    const localPath = join(outputDir, variant, `${photo.photoId}.webp`);
    if (!existsSync(localPath)) preflightProblems.push(`Brak pliku: ${localPath}`);
  }
}

if (preflightProblems.length > 0) {
  throw new Error(`Kontrola przed wysyłką nie powiodła się:\n  - ${preflightProblems.join('\n  - ')}`);
}

console.log(`\nManifest: ${photos.length} zdjęć po obróbce`);
console.log(`Bucket:   ${STORAGE_BUCKET}${force ? '  (tryb --force)' : ''}\n`);
for (const photo of photos) {
  console.log(`  ${photo.editedName} -> ${photo.originalName} -> ${photo.photoId}`);
}

if (!confirmed) {
  console.log('\nTryb podglądu: niczego nie wysłano i nie zmieniono Firestore.');
  console.log('Po akceptacji uruchom ponownie z parametrem --confirm.\n');
  process.exit(0);
}

const storage = bucket();

async function uploadOne(localPath, destination) {
  const file = storage.file(destination);
  if (!force) {
    const [exists] = await file.exists();
    if (exists) {
      const [meta] = await file.getMetadata();
      const token = meta.metadata?.firebaseStorageDownloadTokens;
      if (token) return { token, skipped: true };
    }
  }

  const token = randomUUID();
  await storage.upload(localPath, {
    destination,
    metadata: {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return { token, skipped: false };
}

let index = 0;
let uploaded = 0;
let reused = 0;
let failed = 0;
const done = [];

async function handle(photo) {
  try {
    const thumb = await uploadOne(
      join(outputDir, 'thumb', `${photo.photoId}.webp`),
      `photos/edited/thumb/${photo.photoId}.webp`
    );
    const full = await uploadOne(
      join(outputDir, 'full', `${photo.photoId}.webp`),
      `photos/edited/full/${photo.photoId}.webp`
    );

    if (thumb.skipped && full.skipped) reused++;
    else uploaded++;

    done.push({
      ...photo,
      tThumb: thumb.token,
      tFull: full.token,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    failed++;
    console.error(`  BŁĄD ${photo.editedName}: ${error.message}`);
  }
}

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (index < photos.length) await handle(photos[index++]);
  })
);

if (failed > 0) {
  throw new Error(`Przerwano zapis manifestu. Nie udało się wysłać ${failed} plików.`);
}

const firestore = db();
const existingDocs = await firestore.collection('editedManifest').orderBy('index').get();
const existing = existingDocs.docs.flatMap((document) => document.data().photos ?? []);
const merged = mergeEditedPhotos(existing, done);
const chunks = [];
for (let i = 0; i < merged.length; i += chunkSize) chunks.push(merged.slice(i, i + chunkSize));

const batch = firestore.batch();
chunks.forEach((items, chunkIndex) => {
  const id = `chunk-${String(chunkIndex).padStart(3, '0')}`;
  batch.set(firestore.collection('editedManifest').doc(id), {
    index: chunkIndex,
    count: items.length,
    photos: items,
    updatedAt: new Date().toISOString(),
  });
});
await batch.commit();

const stale = existingDocs.docs.filter(
  (document) => !document.id.match(/^chunk-\d{3}$/) || Number(document.id.slice(6)) >= chunks.length
);
for (const document of stale) await document.ref.delete();

console.log(`\nWysłano:            ${uploaded}`);
console.log(`Użyto istniejących: ${reused}`);
console.log(`Wszystkich obróbek: ${merged.length}`);
console.log(`Porcji manifestu:   ${chunks.length}\n`);
