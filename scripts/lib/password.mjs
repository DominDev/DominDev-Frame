/**
 * Polityka haseł, wersja dla skryptów administracyjnych.
 *
 * Front ma własną kopię tych reguł w `src/lib/password.ts`, bo waliduje
 * na żywo podczas pisania i musi pokazywać, czego jeszcze brakuje.
 * Obie wersje opisują tę samą politykę: min. 8 znaków, wielka litera,
 * mała litera, znak specjalny.
 */

export const MIN_LENGTH = 8;

const RULES = [
  { test: (p) => p.length >= MIN_LENGTH, label: `co najmniej ${MIN_LENGTH} znakow` },
  { test: (p) => /[a-ząćęłńóśźż]/.test(p), label: 'mala litera' },
  { test: (p) => /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(p), label: 'wielka litera' },
  { test: (p) => /[^A-Za-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(p), label: 'znak specjalny' },
];

/** @returns {string[]} lista niespełnionych wymagań, pusta gdy hasło jest poprawne */
export function checkPassword(password) {
  return RULES.filter((r) => !r.test(password)).map((r) => r.label);
}

export function describePolicy() {
  return `Haslo musi zawierac: ${RULES.map((r) => r.label).join(', ')}.`;
}
