/**
 * Polityka haseł dla formularza zmiany hasła.
 *
 * Zwraca listę wymagań wraz z informacją, które są już spełnione, żeby
 * interfejs mógł pokazywać postęp na żywo zamiast odrzucać hasło po fakcie.
 * Skrypty administracyjne mają równoważną kopię w `scripts/lib/password.mjs`.
 */

export const MIN_LENGTH = 8;

export interface PasswordRule {
  label: string;
  met: boolean;
}

const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: `co najmniej ${MIN_LENGTH} znaków`, test: (p) => p.length >= MIN_LENGTH },
  { label: 'mała litera', test: (p) => /[a-ząćęłńóśźż]/.test(p) },
  { label: 'wielka litera', test: (p) => /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(p) },
  {
    label: 'znak specjalny',
    test: (p) => /[^A-Za-z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(p),
  },
];

export function passwordRules(password: string): PasswordRule[] {
  return RULES.map((r) => ({ label: r.label, met: r.test(password) }));
}

export function isPasswordValid(password: string): boolean {
  return RULES.every((r) => r.test(password));
}
