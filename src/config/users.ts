/**
 * Mapa użytkowników aplikacji Frame.
 *
 * Kluczami są UID-y z Firebase Auth. Adresy e-mail celowo nie znajdują się w tym
 * pliku ani nigdzie indziej w repozytorium: repo jest publiczne, a aplikacja
 * identyfikuje użytkownika po UID, więc publikowanie prywatnych adresów nie
 * dawałoby żadnej korzyści.
 *
 * Pole `role` służy wyłącznie do decyzji, co narysować w interfejsie.
 * Uprawnienia egzekwują reguły Firestore i Storage, gdzie UID admina jest
 * wpisany osobno. Podmiana tego pliku w przeglądarce nie daje nikomu dostępu
 * do cudzych danych.
 */

export type Role = 'admin' | 'user';

export interface AppUser {
  /** Imię pokazywane przy komentarzach, w raportach i w nagłówku. */
  name: string;
  role: Role;
}

/** UID admina. Ta sama wartość musi znaleźć się w firestore.rules i storage.rules. */
export const ADMIN_UID = 'ZDJEbmeLnkR8cA4t1wm6KHJvVKr2';

export const USERS: Readonly<Record<string, AppUser>> = {
  [ADMIN_UID]: { name: 'Paweł', role: 'admin' },
  NgFMxRuogIaY5S6sx5Wcn4Gy7mC2: { name: 'Aleksandra', role: 'user' },
  l6yqqGHfzdRXKSlK19f40VIYPDD2: { name: 'Damian', role: 'user' },
  '1WZETHnCh2QuFqjx7wLg2NOCjzx1': { name: 'Renata', role: 'user' },
  nnSRvuCtH4Xk4gMsWU9AFJ4UvFl2: { name: 'Jerzy', role: 'user' },
};

/** Wszystkie UID-y w stałej kolejności - używane w raportach admina. */
export const USER_UIDS: readonly string[] = Object.keys(USERS);

/** Liczba oceniających. Mianownik przy liczeniu, ilu z pięciu już oceniło zdjęcie. */
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
