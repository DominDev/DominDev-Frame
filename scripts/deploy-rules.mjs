/**
 * Wgrywanie reguł bezpieczeństwa Firestore i Storage przez Firebase Rules API.
 *
 *   npm run rules:deploy
 *
 * Robi to samo, co wklejenie reguł w konsoli, ale powtarzalnie i z walidacją
 * składni po stronie Google. Reguły są w repozytorium, więc widać w historii,
 * kiedy i co się zmieniło.
 *
 * Uwaga na nazwy wydań: baza jest nazwana (`frame-db`), więc wydanie Firestore
 * musi wskazywać konkretną bazę, a nie domyślną.
 */

import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { KEY_PATH, PROJECT_ID, DATABASE_ID, STORAGE_BUCKET } from './lib/admin.mjs';

const auth = new GoogleAuth({
  credentials: JSON.parse(readFileSync(KEY_PATH, 'utf8')),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();
const API = 'https://firebaserules.googleapis.com/v1';

const targets = [
  {
    label: 'Firestore',
    file: 'firestore.rules',
    // Wydanie dla nazwanej bazy. Bez sufiksu trafiloby do bazy `(default)`,
    // ktorej w tym projekcie nie ma.
    release: `cloud.firestore/${DATABASE_ID}`,
  },
  {
    label: 'Storage',
    file: 'storage.rules',
    release: `firebase.storage/${STORAGE_BUCKET}`,
  },
];

async function req(method, url, data) {
  return client.request({ method, url, data });
}

let failed = 0;

for (const t of targets) {
  console.log(`\n${t.label} (${t.file})`);

  const content = readFileSync(t.file, 'utf8');

  let rulesetName;
  try {
    const res = await req('POST', `${API}/projects/${PROJECT_ID}/rulesets`, {
      source: { files: [{ name: t.file, content }] },
    });
    rulesetName = res.data.name;
    console.log(`  skladnia poprawna, ruleset: ${rulesetName.split('/').pop()}`);
  } catch (err) {
    const e = err.response?.data?.error;
    console.log(`  BLAD tworzenia rulesetu: ${e?.message ?? err.message}`);
    // API zwraca dokladne miejsce bledu skladni - warto je pokazac.
    for (const issue of e?.details?.[0]?.issues ?? []) {
      console.log(`    linia ${issue.sourcePosition?.line}: ${issue.description}`);
    }
    failed++;
    continue;
  }

  const releaseName = `projects/${PROJECT_ID}/releases/${t.release}`;
  try {
    await req('PATCH', `${API}/${releaseName}`, {
      release: { name: releaseName, rulesetName },
    });
    console.log(`  wydanie zaktualizowane: ${t.release}`);
  } catch (err) {
    // Gdy wydanie jeszcze nie istnieje, PATCH odbija - wtedy trzeba je utworzyc.
    try {
      await req('POST', `${API}/projects/${PROJECT_ID}/releases`, {
        name: releaseName,
        rulesetName,
      });
      console.log(`  wydanie utworzone: ${t.release}`);
    } catch (err2) {
      const e = err2.response?.data?.error ?? err.response?.data?.error;
      console.log(`  BLAD wydania: ${e?.message ?? err2.message}`);
      failed++;
    }
  }
}

console.log('');
if (failed) {
  console.log(`Nie udalo sie wgrac: ${failed} z ${targets.length}.`);
  console.log('Jesli to brak uprawnien, dodaj koncu uslugi role "Firebase Rules Admin"');
  console.log('albo wklej reguly recznie w konsoli Firebase.');
  process.exitCode = 1;
} else {
  console.log('Reguly wgrane.');
}
console.log('');
