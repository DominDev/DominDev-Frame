import { useRef, useState } from 'react';
import { logout } from '../../lib/auth';
import { ChangePasswordDialog } from '../auth/ChangePasswordDialog';
import { ProgressBar } from './ProgressBar';
import styles from './AppHeader.module.css';

interface Props {
  name: string;
  admin: boolean;
  view: 'gallery' | 'admin';
  rated: number;
  total: number;
  /** `null`, gdy wszystko jest już ocenione. */
  onJumpToUnrated: (() => void) | null;
  onGoTo: (view: 'gallery' | 'admin') => void;
  onShowHelp: () => void;
}

export function AppHeader({
  name,
  admin,
  view,
  rated,
  total,
  onJumpToUnrated,
  onGoTo,
  onShowHelp,
}: Props) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const accountRef = useRef<HTMLDetailsElement>(null);

  const closeAccountMenu = () => accountRef.current?.removeAttribute('open');

  return (
    <header className={styles.root}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => onGoTo('gallery')}
          title="Wróć do galerii"
        >
          Frame
        </button>
        <ProgressBar rated={rated} total={total} />
      </div>

      <nav className={styles.right} aria-label="Menu">
        {onJumpToUnrated && (
          <button
            type="button"
            className={styles.action}
            aria-label="Oceniaj dalej - otwórz pierwsze nieocenione zdjęcie"
            onClick={onJumpToUnrated}
          >
            Oceniaj dalej
          </button>
        )}

        {admin && (
          <button
            type="button"
            className={styles.action}
            onClick={() => onGoTo(view === 'admin' ? 'gallery' : 'admin')}
          >
            {view === 'admin' ? 'Galeria' : 'Raporty'}
          </button>
        )}

        <div className={styles.desktopAccount}>
          <span className={styles.name}>{name}</span>
          <button type="button" className={styles.quiet} onClick={onShowHelp}>
            Jak oceniać?
          </button>
          <button type="button" className={styles.quiet} onClick={() => setPasswordOpen(true)}>
            Zmień hasło
          </button>
          <button type="button" className={styles.quiet} onClick={() => void logout()}>
            Wyloguj
          </button>
        </div>

        <details ref={accountRef} className={styles.mobileAccount}>
          <summary className={styles.accountSummary}>
            <span>{name}</span>
            <span className={styles.accountHint}>konto</span>
          </summary>
          <div className={styles.accountMenu}>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                closeAccountMenu();
                onShowHelp();
              }}
            >
              Jak oceniać?
            </button>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                closeAccountMenu();
                setPasswordOpen(true);
              }}
            >
              Zmień hasło
            </button>
            <button
              type="button"
              className={styles.quiet}
              onClick={() => {
                closeAccountMenu();
                void logout();
              }}
            >
              Wyloguj
            </button>
          </div>
        </details>
      </nav>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </header>
  );
}
