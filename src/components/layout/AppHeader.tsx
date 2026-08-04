import { useState } from 'react';
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
}

export function AppHeader({ name, admin, view, rated, total, onJumpToUnrated, onGoTo }: Props) {
  const [passwordOpen, setPasswordOpen] = useState(false);

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
          <button type="button" className={styles.action} onClick={onJumpToUnrated}>
            Pierwsze nieocenione
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

        <span className={styles.name}>{name}</span>

        <button type="button" className={styles.quiet} onClick={() => setPasswordOpen(true)}>
          Zmień hasło
        </button>
        <button type="button" className={styles.quiet} onClick={() => void logout()}>
          Wyloguj
        </button>
      </nav>

      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </header>
  );
}
