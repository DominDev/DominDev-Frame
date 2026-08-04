/**
 * Typowany dostęp do mapy użytkowników.
 *
 * Dane leżą w `users.json`, żeby front i skrypty administracyjne czytały
 * dokładnie to samo - skrypty są zwykłym JavaScriptem i nie zaimportowałyby
 * modułu TypeScript. Ten plik dokłada wyłącznie typy i funkcje pomocnicze.
 *
 * Pole `role` służy do decyzji, co narysować w interfejsie. Uprawnienia
 * egzekwują reguły Firestore i Storage, gdzie UID admina jest wpisany osobno.
 * Podmiana tego pliku w przeglądarce nie daje nikomu dostępu do cudzych danych.
 */

import data from './users.json';

export type Role = 'admin' | 'user';

export interface AppUser {
  /** Imię pokazywane przy komentarzach, w raportach i w nagłówku. */
  name: string;
  role: Role;
}

/** UID admina. Ta sama wartość musi znaleźć się w firestore.rules i storage.rules. */
export const ADMIN_UID: string = data.adminUid;

export const USERS: Readonly<Record<string, AppUser>> = data.users as Record<string, AppUser>;

/** Wszystkie UID-y w stałej kolejności - używane w raportach admina. */
export const USER_UIDS: readonly string[] = Object.keys(USERS);

/** Liczba oceniających. Mianownik przy liczeniu, ilu z pięciu oceniło już zdjęcie. */
export const USER_COUNT = USER_UIDS.length;

/**
 * Imię użytkownika. Dla nieznanego UID zwraca łagodny fallback zamiast rzucać
 * wyjątkiem, żeby pojedyncze osierocone konto nie wywróciło całej galerii.
 */
export function userName(uid: string | null | undefined): string {
  if (!uid) return 'Nieznany';
  return USERS[uid]?.name ?? 'Nieznany';
}

export function isAdmin(uid: string | null | undefined): boolean {
  return uid === ADMIN_UID;
}
