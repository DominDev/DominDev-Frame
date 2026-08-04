import type { Rating } from '../../types';
import { RATING_LABELS, RATING_VALUES } from '../../config/constants';
import styles from './StarRating.module.css';

interface Props {
  /** Nazwa grupy - musi być unikalna na stronie, inaczej gwiazdki różnych zdjęć zlałyby się w jedną. */
  name: string;
  value: Rating | undefined;
  onChange: (value: Rating | null) => void;
  size?: 'sm' | 'lg';
  /** Etykieta czytana przez czytniki ekranu. */
  label: string;
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Ocena 1-5 zbudowana na prawdziwych polach radio.
 *
 * Dzięki temu klawiatura i czytniki ekranu działają bez dopisywania ARIA,
 * a strzałki przełączają wartości tak, jak użytkownik się tego spodziewa.
 *
 * Kliknięcie w już wybraną gwiazdkę cofa ocenę do "brak" - inaczej pomyłkowego
 * kliknięcia nie dałoby się wycofać, a plan zakłada możliwość zmiany zdania.
 */
export function StarRating({ name, value, onChange, size = 'sm', label }: Props) {
  return (
    <fieldset className={`${styles.root} ${size === 'lg' ? styles.large : ''}`}>
      <legend className="visuallyHidden">{label}</legend>

      {RATING_VALUES.map((v) => {
        const id = `${name}-${v}`;
        const selected = value === v;
        return (
          <span key={v} className={styles.item}>
            <input
              className="visuallyHidden"
              type="radio"
              id={id}
              name={name}
              value={v}
              checked={selected}
              onChange={() => onChange(v)}
            />
            <label
              className={`${styles.star} ${value !== undefined && v <= value ? styles.on : ''}`}
              htmlFor={id}
              title={`${v} - ${RATING_LABELS[v]}`}
              onClick={(e) => {
                if (!selected) return;
                // Powtórne kliknięcie cofa ocenę. Bez preventDefault przeglądarka
                // od razu zaznaczyłaby to samo pole z powrotem.
                e.preventDefault();
                onChange(null);
              }}
            >
              <Star filled={value !== undefined && v <= value} />
              <span className="visuallyHidden">
                {v} - {RATING_LABELS[v]}
              </span>
            </label>
          </span>
        );
      })}
    </fieldset>
  );
}
