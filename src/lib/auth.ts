/**
 * Logowanie i zmiana własnego hasła.
 *
 * Komunikaty błędów są tłumaczone na zdania, które coś mówią osobie
 * nietechnicznej. Domyślne komunikaty Firebase to kody w rodzaju
 * `auth/invalid-credential`, bezużyteczne dla rodziny.
 */

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { auth } from '../config/firebase';

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'To nie wygląda na poprawny adres e-mail.',
  'auth/user-not-found': 'Nie ma konta o tym adresie.',
  'auth/wrong-password': 'Nieprawidłowe hasło.',
  'auth/invalid-credential': 'Nieprawidłowy adres e-mail lub hasło.',
  'auth/too-many-requests': 'Za dużo prób. Odczekaj chwilę i spróbuj ponownie.',
  'auth/network-request-failed': 'Brak połączenia z internetem.',
  'auth/weak-password': 'Hasło jest za słabe.',
  'auth/requires-recent-login': 'Ze względów bezpieczeństwa podaj jeszcze raz obecne hasło.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  return MESSAGES[code] ?? 'Coś poszło nie tak. Spróbuj jeszcze raz.';
}

export function login(email: string, password: string): Promise<unknown> {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export function logout(): Promise<void> {
  return signOut(auth);
}

/**
 * Zmiana własnego hasła.
 *
 * Firebase wymaga świeżego logowania, a sesja rodziny bywa tygodniowa, więc
 * najpierw uwierzytelniamy ponownie obecnym hasłem. Przy okazji chroni to przed
 * zmianą hasła na cudzym, niezablokowanym komputerze.
 */
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Nie jesteś zalogowany.');

  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}
