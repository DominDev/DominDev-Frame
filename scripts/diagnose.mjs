/**
 * Diagnostyka: co faktycznie istnieje w projekcie.
 *
 * Pyta REST API Google o listę baz Firestore i bucketów, bo komunikaty SDK
 * ("bucket does not exist", "insufficient permissions") nie odróżniają braku
 * zasobu od braku uprawnień.
 */

import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { KEY_PATH, PROJECT_ID } from './lib/admin.mjs';

const auth = new GoogleAuth({
  credentials: JSON.parse(readFileSync(KEY_PATH, 'utf8')),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});
const client = await auth.getClient();

async function get(url) {
  try {
    const res = await client.request({ url });
    return res.data;
  } catch (err) {
    return { __error: err.response?.data?.error?.message ?? err.message };
  }
}

console.log(`\nProjekt: ${PROJECT_ID}\n`);

console.log('Bazy Firestore');
const dbs = await get(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases`);
if (dbs.__error) {
  console.log(`  blad: ${dbs.__error}`);
} else if (!dbs.databases?.length) {
  console.log('  BRAK - w projekcie nie ma zadnej bazy Firestore');
} else {
  for (const d of dbs.databases) {
    const id = d.name.split('/').pop();
    console.log(`  id="${id}"  region=${d.locationId}  typ=${d.type}  edycja=${d.databaseEdition ?? 'n/d'}`);
  }
}

console.log('\nBuckety Cloud Storage');
const buckets = await get(
  `https://storage.googleapis.com/storage/v1/b?project=${PROJECT_ID}&projection=noAcl`
);
if (buckets.__error) {
  console.log(`  blad: ${buckets.__error}`);
} else if (!buckets.items?.length) {
  console.log('  BRAK - w projekcie nie ma zadnego bucketu');
} else {
  for (const b of buckets.items) {
    console.log(`  ${b.name}\n    lokalizacja=${b.location} (${b.locationType})  klasa=${b.storageClass}`);
  }
}

console.log('');
