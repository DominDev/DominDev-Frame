import styles from './FavoriteButton.module.css';

interface Props {
  active: boolean;
  onToggle: () => void;
  /** Nazwa pliku, żeby czytnik ekranu powiedział, o które zdjęcie chodzi. */
  photoName: string;
  size?: 'sm' | 'lg';
}

/**
 * Ulubione są prywatne: widzi je właściciel i admin, nikt więcej. To wymóg
 * funkcjonalny egzekwowany regułami bazy, a nie samym interfejsem.
 */
export function FavoriteButton({ active, onToggle, photoName, size = 'sm' }: Props) {
  return (
    <button
      type="button"
      className={`${styles.root} ${active ? styles.active : ''} ${size === 'lg' ? styles.large : ''}`}
      onClick={onToggle}
      aria-pressed={active}
      title={active ? 'Usuń z ulubionych' : 'Dodaj do ulubionych (widzisz tylko Ty)'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
        <path
          d="M12 20.7l-1.4-1.3C5.4 14.7 2 11.6 2 7.9 2 5.1 4.2 3 6.9 3c1.6 0 3.1.7 4.1 1.9l1 1.2 1-1.2C14 3.7 15.5 3 17.1 3 19.8 3 22 5.1 22 7.9c0 3.7-3.4 6.8-8.6 11.5L12 20.7z"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
      <span className="visuallyHidden">
        {active ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}: {photoName}
      </span>
    </button>
  );
}
