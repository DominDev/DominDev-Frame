import { useState, type FormEvent } from 'react';
import { authErrorMessage, login } from '../../lib/auth';
import styles from './LoginForm.module.css';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
    // Przy powodzeniu komponent znika razem ze zmianą stanu logowania,
    // więc `busy` celowo zostaje włączone - inaczej przycisk mrugnąłby
    // na moment aktywny.
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Frame</h1>
        <p className={styles.lead}>
          Wybieramy zdjęcia z sesji rodzinnej. Zaloguj się adresem, na który dostałeś hasło.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="email">Adres e-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Hasło</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button className={styles.submit} type="submit" disabled={busy || !email || !password}>
            {busy ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <p className={styles.hint}>
          Nie pamiętasz hasła? Napisz do Pawła - ustawi nowe.
        </p>
      </div>
    </main>
  );
}
