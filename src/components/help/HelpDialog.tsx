import { useEffect, useRef } from 'react';
import { RATING_LABELS, RATING_VALUES } from '../../config/constants';
import styles from './HelpDialog.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpDialog({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="rating-help-title"
      onClose={onClose}
    >
      <div className={styles.inner}>
        <div className={styles.content}>
          <h2 id="rating-help-title" className={styles.title}>
            Jak wybieramy zdjęcia?
          </h2>
          <p className={styles.lead}>
            Oceniaj zgodnie z własnym zdaniem. Średnią innych osób zobaczysz dopiero po swojej
            ocenie, żeby niczego Ci nie sugerowała.
          </p>

          <p className={styles.scaleQuestion}>Czy warto wybrać to zdjęcie do obróbki?</p>
          <ol className={styles.scale} aria-label="Znaczenie ocen od 1 do 5">
            {RATING_VALUES.map((value) => (
              <li key={value}>
                <strong>{value}</strong>
                <span>{RATING_LABELS[value]}</span>
              </li>
            ))}
          </ol>

          <div className={styles.notes}>
            <p>
              <strong>Serce:</strong> Twoje ulubione widzisz tylko Ty i Paweł jako administrator.
            </p>
            <p>
              <strong>Komentarze:</strong> widzą je wszyscy członkowie rodziny.
            </p>
            <p>
              <strong>Obrobione:</strong> zielona plakietka oznacza, że w podglądzie możesz
              przełączyć zdjęcie między wersją przed i po obróbce.
            </p>
            <p>
              <strong>Komputer:</strong> klawisze 1-5 oceniają, strzałki zmieniają zdjęcie, a L
              włącza lub wyłącza lupę.
            </p>
            <p>
              <strong>Telefon:</strong> dotknij zdjęcia dwukrotnie, żeby je powiększyć.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.primary} onClick={onClose}>
            Rozumiem, zaczynam
          </button>
        </div>
      </div>
    </dialog>
  );
}
