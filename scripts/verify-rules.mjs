/**
 * Automatyczna weryfikacja reguł bezpieczeństwa.
 *
 *   npm run rules:verify
 *
 * Przechodzi checklistę ze specyfikacji, uderzając w REST API
 * Firestore tokenami zwykłych użytkowników. Rules są przy takich żądaniach
 * egzekwowane dokładnie tak samo jak dla przeglądarki - inaczej niż przy
 * połączeniu kluczem konta usługi, który reguły omija.
 *
 * Tokeny powstają przez `createCustomToken` w Admin SDK, więc skrypt nie musi
 * znać niczyjego hasła.
 *
 * Test zostawia po sobie czysto: dopisane pola i komentarze są kasowane.
 */

import { auth, db, PROJECT_ID, DATABASE_ID, STORAGE_BUCKET } from './lib/admin.mjs';
import { ADMIN_UID, USER_UIDS, userName } from './lib/users.mjs';

const API_KEY = 'AIzaSyDyldGrzfABvHz9e0XXQVgenAOIsoTCilM';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

/** Klucz testowy zaczyna się od litery, żeby nie wymagał cytowania w updateMask. */
const TEST_KEY = 'ZZtest_rules_probe';

// --- Logowanie użytkowników bez haseł --------------------------------------

async function idTokenFor(uid) {
  const customToken = await auth().createCustomToken(uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`Nie udalo sie uzyskac tokenu dla ${uid}: ${JSON.stringify(data)}`);
  return data.idToken;
}

async function call(method, path, { token, body, query = '' } = {}) {
  const res = await fetch(`${BASE}/${path}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.status;
}

// --- Ramy testu ------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(n, description, actual, expected) {
  const ok = expected === 'allow' ? actual < 400 : actual >= 400;
  if (ok) passed++;
  else failed++;
  console.log(
    `  ${ok ? '[ok]  ' : '[BLAD]'} ${String(n).padStart(2)}. ${description}` +
      `  ->  HTTP ${actual} ${ok ? '' : `(oczekiwano ${expected === 'allow' ? 'sukcesu' : 'odmowy'})`}`
  );
}

const field = (v) =>
  typeof v === 'number'
    ? Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v }
    : typeof v === 'boolean'
      ? { booleanValue: v }
      : { stringValue: String(v) };

const ratingWrite = (value) => ({ fields: { [TEST_KEY]: field(value) } });
const MASK = `?updateMask.fieldPaths=${TEST_KEY}`;

console.log(`\nWeryfikacja regul: projekt ${PROJECT_ID}, baza ${DATABASE_ID}\n`);

const admin = ADMIN_UID;
const user = USER_UIDS.find((u) => u !== ADMIN_UID);
const other = USER_UIDS.find((u) => u !== ADMIN_UID && u !== user);

console.log(`Testowi uzytkownicy: admin=${userName(admin)}, user=${userName(user)}, inny=${userName(other)}\n`);

const tAdmin = await idTokenFor(admin);
const tUser = await idTokenFor(user);

// --- Checklista ------------------------------------------------------------

console.log('Odczyt bez logowania');
check(1, 'niezalogowany nie odczyta manifestu', await call('GET', 'manifest/chunk-000'), 'deny');
check(1, 'niezalogowany nie odczyta obróbek  ', await call('GET', 'editedManifest/chunk-000'), 'deny');
check(1, 'niezalogowany nie odczyta ocen   ', await call('GET', `ratings/${admin}`), 'deny');

console.log('\nOceny');
check(
  0,
  'kontrola pozytywna: wlasna ocena 4 przechodzi',
  await call('PATCH', `ratings/${user}`, { token: tUser, body: ratingWrite(4), query: MASK }),
  'allow'
);
check(
  2,
  'nie zapisze cudzego dokumentu ocen',
  await call('PATCH', `ratings/${other}`, { token: tUser, body: ratingWrite(4), query: MASK }),
  'deny'
);
for (const bad of [0, 6, 3.5, 'piec']) {
  check(
    3,
    `ocena ${JSON.stringify(bad)} odrzucona`.padEnd(34),
    await call('PATCH', `ratings/${user}`, { token: tUser, body: ratingWrite(bad), query: MASK }),
    'deny'
  );
}

console.log('\nUlubione');

// Dokument musi istniec, inaczej odczyt zwroci 404 i nie odroznimy "wolno, ale
// pusto" od "nie wolno". Odmowa daje 403 niezaleznie od istnienia dokumentu.
for (const uid of [other, user]) {
  await db().collection('favorites').doc(uid).set({ [TEST_KEY]: true }, { merge: true });
}

check(4, 'nie odczyta cudzych ulubionych', await call('GET', `favorites/${other}`, { token: tUser }), 'deny');
check(5, 'admin odczyta cudze ulubione ', await call('GET', `favorites/${other}`, { token: tAdmin }), 'allow');
check(
  0,
  'kontrola pozytywna: wlasne ulubione widoczne',
  await call('GET', `favorites/${user}`, { token: tUser, }),
  'allow'
);

console.log('\nManifest');
check(
  9,
  'front nie zapisze do manifestu',
  await call('PATCH', 'manifest/chunk-000', { token: tAdmin, body: { fields: { hack: field('x') } }, query: '?updateMask.fieldPaths=hack' }),
  'deny'
);
check(
  9,
  'front nie zapisze manifestu obróbek',
  await call('PATCH', 'editedManifest/chunk-000', { token: tAdmin, body: { fields: { hack: field('x') } }, query: '?updateMask.fieldPaths=hack' }),
  'deny'
);

console.log('\nKomentarze');
const comment = (uid, text, extra = {}) => ({
  fields: {
    photoId: field('ZZtest_photo'),
    uid: field(uid),
    text: field(text),
    createdAt: { timestampValue: new Date().toISOString() },
    ...extra,
  },
});

check(
  6,
  'komentarz z cudzym uid odrzucony',
  await call('POST', 'comments', { token: tUser, body: comment(other, 'podszywam sie') }),
  'deny'
);
check(
  12,
  'komentarz ponad 1000 znakow odrzucony',
  await call('POST', 'comments', { token: tUser, body: comment(user, 'x'.repeat(1001)) }),
  'deny'
);
check(
  13,
  'komentarz z nadmiarowym polem odrzucony',
  await call('POST', 'comments', { token: tUser, body: comment(user, 'ok', { rola: field('admin') }) }),
  'deny'
);
check(
  6,
  'komentarz z podstawiona data odrzucony',
  await call('POST', 'comments', {
    token: tUser,
    body: {
      fields: {
        photoId: field('ZZtest_photo'),
        uid: field(user),
        text: field('ok'),
        createdAt: { timestampValue: '2020-01-01T00:00:00Z' },
      },
    },
  }),
  'deny'
);

// Komentarz zalozony przez Admin SDK (omija reguly), zeby przetestowac edycje
// i kasowanie przez zwyklych uzytkownikow.
const ref = await db().collection('comments').add({
  photoId: 'ZZtest_photo',
  uid: other,
  text: 'komentarz testowy',
  createdAt: new Date(),
});

check(
  7,
  'nie usunie cudzego komentarza',
  await call('DELETE', `comments/${ref.id}`, { token: tUser }),
  'deny'
);
check(
  11,
  'nie podmieni autora cudzego komentarza',
  await call('PATCH', `comments/${ref.id}`, {
    token: tUser,
    body: { fields: { uid: field(user) } },
    query: '?updateMask.fieldPaths=uid',
  }),
  'deny'
);
check(8, 'admin usunie dowolny komentarz', await call('DELETE', `comments/${ref.id}`, { token: tAdmin }), 'allow');

console.log('\nStorage');
const path = encodeURIComponent('photos/thumb/6U2A7358_png.webp');
const noToken = await fetch(
  `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${path}?alt=media`
);
check(10, 'plik bez tokenu niedostepny', noToken.status, 'deny');
const listing = await fetch(`https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?prefix=photos/`);
check(10, 'listowanie bucketu odmowione', listing.status, 'deny');

// --- Sprzątanie ------------------------------------------------------------

const { FieldValue } = await import('firebase-admin/firestore');

for (const [collection, uid] of [
  ['ratings', user],
  ['favorites', other],
  ['favorites', user],
]) {
  await db()
    .collection(collection)
    .doc(uid)
    .update({ [TEST_KEY]: FieldValue.delete() })
    .catch(() => {});
}

const leftovers = await db().collection('comments').where('photoId', '==', 'ZZtest_photo').get();
for (const doc of leftovers.docs) await doc.ref.delete();

console.log(`\nZaliczone: ${passed}   Niezaliczone: ${failed}\n`);
if (failed) process.exitCode = 1;
