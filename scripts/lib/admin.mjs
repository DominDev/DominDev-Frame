/**
 * Wspólna inicjalizacja Firebase Admin SDK dla skryptów administracyjnych.
 *
 * Klucz konta usługi leży POZA repozytorium, w katalogu domowym użytkownika.
 * Plik, którego nie ma w katalogu projektu, nie wycieknie przez pomyłkowy
 * `git add -f` ani przez skopiowanie folderu.
 *
 * Ścieżkę można nadpisać zmienną FRAME_SERVICE_ACCOUNT, gdyby klucz musiał
 * kiedyś zamieszkać gdzie indziej.
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

export const PROJECT_ID = 'frame-a4fba';
export const STORAGE_BUCKET = 'frame-a4fba.firebasestorage.app';
export const DATABASE_ID = 'frame-db';

export const KEY_PATH =
  process.env.FRAME_SERVICE_ACCOUNT ?? join(homedir(), '.frame', 'service-account.json');

/** Rzuca czytelnym błędem zamiast stosu z wnętrza SDK, gdy klucza brakuje. */
function loadServiceAccount() {
  if (!existsSync(KEY_PATH)) {
    throw new Error(
      `Nie znaleziono klucza konta usługi:\n  ${KEY_PATH}\n\n` +
        'Pobierz go z konsoli Firebase: Project settings > Service accounts >\n' +
        'Generate new private key, i zapisz pod powyższą ścieżką.'
    );
  }

  const key = JSON.parse(readFileSync(KEY_PATH, 'utf8'));

  if (key.project_id !== PROJECT_ID) {
    throw new Error(
      `Klucz należy do projektu "${key.project_id}", a oczekiwano "${PROJECT_ID}".\n` +
        'Prawdopodobnie pobrany z niewłaściwego projektu Firebase.'
    );
  }

  return key;
}

let app;

export function adminApp() {
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert(loadServiceAccount()),
        projectId: PROJECT_ID,
        storageBucket: STORAGE_BUCKET,
      });
  }
  return app;
}

/** Firestore wskazuje nazwaną bazę - projekt nie ma bazy `(default)`. */
export const db = () => getFirestore(adminApp(), DATABASE_ID);
export const bucket = () => getStorage(adminApp()).bucket();
export const auth = () => getAuth(adminApp());
