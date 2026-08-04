/**
 * Weryfikacja konfiguracji Firebase po stronie serwera.
 *
 * Sprawdza to, czego nie widać wygodnie w konsoli albo co łatwo kliknąć źle:
 * region bucketu (decyduje o tym, czy mieścimy się w Always Free), klasę
 * przechowywania, dostępność nazwanej bazy i komplet kont.
 *
 *   npm run verify:firebase
 */

import { bucket, db, auth, PROJECT_ID, STORAGE_BUCKET, DATABASE_ID } from './lib/admin.mjs';
import { USERS } from './lib/users.mjs';

/** Regiony objęte darmowym progiem Cloud Storage. */
const FREE_TIER_REGIONS = ['US-CENTRAL1', 'US-EAST1', 'US-WEST1'];

const ok = (msg) => console.log(`  [ok]    ${msg}`);
const warn = (msg) => console.log(`  [uwaga] ${msg}`);
const fail = (msg) => console.log(`  [BLAD]  ${msg}`);

let problems = 0;

console.log(`\nWeryfikacja projektu ${PROJECT_ID}\n`);

// --- Storage ---------------------------------------------------------------
console.log('Storage');
try {
  const [meta] = await bucket().getMetadata();
  const location = String(meta.location ?? '').toUpperCase();
  const isMultiRegion = String(meta.locationType ?? '') !== 'region';

  console.log(`          bucket: ${STORAGE_BUCKET}`);
  console.log(`          lokalizacja: ${meta.location} (${meta.locationType})`);
  console.log(`          klasa: ${meta.storageClass}`);

  if (isMultiRegion) {
    fail(
      `lokalizacja typu "${meta.locationType}" nie kwalifikuje sie do Always Free ` +
        '- darmowy prog obejmuje wylacznie regiony pojedyncze'
    );
    problems++;
  } else if (!FREE_TIER_REGIONS.includes(location)) {
    fail(`region ${meta.location} jest poza Always Free (${FREE_TIER_REGIONS.join(', ')})`);
    problems++;
  } else {
    ok(`region ${meta.location} objety Always Free`);
  }

  if (String(meta.storageClass).toUpperCase() !== 'STANDARD') {
    warn(`klasa ${meta.storageClass} zamiast STANDARD - darmowy prog dotyczy STANDARD`);
  }
} catch (err) {
  fail(`nie udalo sie odczytac bucketu: ${err.message}`);
  problems++;
}

// --- Firestore -------------------------------------------------------------
console.log('\nFirestore');
try {
  const probe = db().collection('_verify').doc('probe');
  await probe.set({ at: new Date().toISOString() });
  await probe.delete();
  ok(`baza "${DATABASE_ID}" odpowiada na zapis i kasowanie`);
} catch (err) {
  fail(`baza "${DATABASE_ID}" niedostepna: ${err.message}`);
  problems++;
}

// --- Konta -----------------------------------------------------------------
console.log('\nKonta');
try {
  const { users } = await auth().listUsers(50);
  const byUid = new Map(users.map((u) => [u.uid, u]));

  console.log(`          znaleziono kont: ${users.length}`);

  for (const [uid, { name }] of Object.entries(USERS)) {
    const found = byUid.get(uid);
    if (found) {
      const masked = found.email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
      ok(`${name.padEnd(11)} ${uid}  ${masked}`);
    } else {
      fail(`${name.padEnd(11)} ${uid}  - brak konta o tym UID`);
      problems++;
    }
  }

  const extra = users.filter((u) => !USERS[u.uid]);
  for (const u of extra) {
    warn(`konto spoza mapy uzytkownikow: ${u.uid}`);
  }
} catch (err) {
  fail(`nie udalo sie odczytac listy kont: ${err.message}`);
  problems++;
}

// --- Podsumowanie ----------------------------------------------------------
console.log('');
if (problems === 0) {
  console.log('Konfiguracja poprawna.\n');
} else {
  console.log(`Problemow do naprawienia: ${problems}\n`);
  process.exitCode = 1;
}
