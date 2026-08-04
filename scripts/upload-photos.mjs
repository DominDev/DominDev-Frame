/**
 * Wysyłka przetworzonych zdjęć do Firebase Storage i zapis manifestu do Firestore.
 *
 *   npm run photos:upload            wysyła tylko brakujące pliki
 *   npm run photos:upload -- --force wysyła wszystko od nowa (nowe tokeny)
 *
 * Każdy plik dostaje token pobierania. Adres z tokenem jest kluczem na okaziciela:
 * kto go zna, pobierze plik bez logowania, niezależnie od reguł Storage. Dlatego
 * manifest z tokenami trafia do Firestore, za reguły - osoba niezalogowana nie
 * zdobędzie żadnego adresu. Token da się unieważnić, co zabija stare linki.
 *
 * Przy ponownym uruchomieniu bez --force tokeny istniejących plików są odczytywane
 * i zachowywane, żeby adresy pozostały stabilne i nie unieważniały cache przeglądarek.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { bucket, db, STORAGE_BUCKET } from './lib/admin.mjs';

const OUT_DIR = '_processed';
const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');
const CHUNK_SIZE = 250;
const CONCURRENCY = 8;

const force = process.argv.includes('--force');

if (!existsSync(MANIFEST_PATH)) {
  console.error(`Brak ${MANIFEST_PATH}. Uruchom najpierw: npm run photos:prepare`);
  process.exit(1);
}

const photos = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
console.log(`\nManifest: ${photos.length} zdjec`);
console.log(`Bucket:   ${STORAGE_BUCKET}${force ? '  (tryb --force)' : ''}\n`);

const b = bucket();

/**
 * Wysyła jeden plik i zwraca jego token pobierania. Jeśli obiekt już istnieje
 * i ma token, zwraca istniejący zamiast wysyłać ponownie.
 */
async function uploadOne(localPath, destination) {
  const file = b.file(destination);

  if (!force) {
    const [exists] = await file.exists();
    if (exists) {
      const [meta] = await file.getMetadata();
      const token = meta.metadata?.firebaseStorageDownloadTokens;
      if (token) return { token, skipped: true };
    }
  }

  const token = randomUUID();
  await b.upload(localPath, {
    destination,
    metadata: {
      contentType: 'image/webp',
      // Zdjecia sa niezmienne: nowa wersja dostalaby nowy token, wiec adres
      // tez by sie zmienil. Mozna wiec cache'owac agresywnie.
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return { token, skipped: false };
}

let uploaded = 0;
let reused = 0;
let failed = 0;
const done = [];

async function handle(photo) {
  try {
    const thumb = await uploadOne(join(OUT_DIR, 'thumb', `${photo.id}.webp`), `photos/thumb/${photo.id}.webp`);
    const full = await uploadOne(join(OUT_DIR, 'full', `${photo.id}.webp`), `photos/full/${photo.id}.webp`);

    if (thumb.skipped && full.skipped) reused++;
    else uploaded++;

    done.push({
      id: photo.id,
      name: photo.name,
      w: photo.w,
      h: photo.h,
      tThumb: thumb.token,
      tFull: full.token,
    });
  } catch (err) {
    failed++;
    console.error(`  BLAD ${photo.name}: ${err.message}`);
  }
}

async function runPool(tasks, limit) {
  let index = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (index < tasks.length) {
        await handle(tasks[index++]);
        const n = uploaded + reused + failed;
        if (n % 50 === 0 || n === tasks.length) console.log(`  ${String(n).padStart(4)} / ${tasks.length}`);
      }
    })
  );
}

const started = Date.now();
console.log('Wysylka:');
await runPool(photos, CONCURRENCY);

if (failed > 0) {
  console.error(`\nPRZERWANO zapis manifestu: ${failed} plikow sie nie wyslalo.`);
  console.error('Napraw przyczyne i uruchom skrypt ponownie - wyslane pliki zostana pominiete.');
  process.exit(1);
}

// --- Manifest do Firestore -------------------------------------------------
//
// Pozycje dopisuja sie w kolejnosci ZAKONCZENIA rownoleglych wysylek, wiec przed
// zapisem trzeba przywrocic kolejnosc z manifestu. Inaczej podzial na porcje
// bylby losowy i zmienialby sie przy kazdym uruchomieniu, generujac zapisy
// dokumentow bez zadnej zmiany tresci.

const order = new Map(photos.map((p, i) => [p.id, i]));
done.sort((a, b) => order.get(a.id) - order.get(b.id));

console.log('\nZapis manifestu do Firestore:');

const firestore = db();
const chunks = [];
for (let i = 0; i < done.length; i += CHUNK_SIZE) chunks.push(done.slice(i, i + CHUNK_SIZE));

const batch = firestore.batch();
chunks.forEach((photos, i) => {
  const id = `chunk-${String(i).padStart(3, '0')}`;
  batch.set(firestore.collection('manifest').doc(id), {
    index: i,
    count: photos.length,
    photos,
    updatedAt: new Date().toISOString(),
  });
  console.log(`  ${id}: ${photos.length} zdjec`);
});
await batch.commit();

// Porcje z poprzedniego, dluzszego przebiegu musza zniknac, inaczej galeria
// pokazywalaby zdjecia, ktorych juz nie ma.
const existing = await firestore.collection('manifest').listDocuments();
const stale = existing.filter((d) => !d.id.match(/^chunk-\d{3}$/) || Number(d.id.slice(6)) >= chunks.length);
for (const doc of stale) {
  await doc.delete();
  console.log(`  usunieto nieaktualna porcje: ${doc.id}`);
}

const secs = ((Date.now() - started) / 1000).toFixed(0);
console.log('');
console.log(`Wyslano:        ${uploaded}`);
console.log(`Pominieto:      ${reused} (juz byly w buckecie, token zachowany)`);
console.log(`Porcji w bazie: ${chunks.length}`);
console.log(`Czas:           ${secs} s`);
console.log('');
