import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import styles from './MagnifierImage.module.css';

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Lupka podążająca za kursorem ma sens wyłącznie tam, gdzie kursor istnieje. */
  hoverLens: boolean;
}

const LENS_SIZE = 260;

/**
 * Stopnie powiększenia soczewki, jako mnożnik skali 1:1 wobec pliku.
 *
 * Materiałem są zrzuty ekranu galerii, w których sama fotografia zajmuje
 * około 690 px szerokości przy pionowym kadrze. Skala 1:1 daje przy takim
 * źródle ledwie półtorakrotne powiększenie, więc same stopnie 1x są tu za mało
 * użyteczne. Wyższe nie dokładają detalu - powiększają to, co jest.
 */
const LENS_LEVELS = [1, 2, 3];
const LENS_KEY = 'frame:lensLevel';

/**
 * Stopnie powiększenia jako mnożnik skali 1:1 wobec pikseli urządzenia.
 *
 * Stopień 1 pokazuje dokładnie tyle detalu, ile jest w pliku - to granica
 * uczciwego powiększenia. Stopień 2 już nic nie dokłada do ostrości, ale na
 * telefonie ma inny sens: piksel urządzenia jest fizycznie malutki, więc obraz
 * w skali 1:1 bywa po prostu za mały dla oka. Działa jak szkło powiększające
 * nad odbitką - nie tworzy detalu, ale pozwala go dostrzec.
 */
const ZOOM_STEPS = [1, 2];

/** Dwa tapnięcia bliżej siebie niż tyle milisekund i pikseli to podwójne tapnięcie. */
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Zdjęcie z powiększaniem dobranym do urządzenia.
 *
 * Na myszy: soczewka podążająca za kursorem, w skali 1:1 wobec pliku.
 * Na dotyku: podwójne tapnięcie przełącza kolejne stopnie powiększenia,
 * a przeciąganie palcem przesuwa kadr.
 *
 * Podwójne tapnięcie zamiast pojedynczego jest tu konieczne, nie kosmetyczne:
 * pojedynczego dotknięcia nie da się odróżnić od początku przeciągania, więc
 * przesuwanie powiększonego zdjęcia przypadkiem je zamykało.
 */
export function MagnifierImage({ src, alt, width, height, hoverLens }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const [lens, setLens] = useState<{ x: number; y: number; bgX: number; bgY: number } | null>(null);
  /** 0 = dopasowane do ekranu, dalej kolejne pozycje z ZOOM_STEPS. */
  const [step, setStep] = useState(0);

  // Soczewka domyślnie wyłączona: pojawiając się przy każdym ruchu myszy,
  // zasłaniała zdjęcie właśnie wtedy, gdy chciało się je obejrzeć w całości.
  // Ustawienie przeżywa przejście do kolejnego zdjęcia i odświeżenie strony.
  const [lensLevel, setLensLevel] = useState(() => Number(localStorage.getItem(LENS_KEY) ?? 0));
  useEffect(() => {
    localStorage.setItem(LENS_KEY, String(lensLevel));
  }, [lensLevel]);

  // Zmiana zdjęcia wraca do widoku dopasowanego - inaczej kolejne zdjęcie
  // otwierałoby się przewinięte w losowe miejsce.
  useEffect(() => {
    setStep(0);
    setLens(null);
    lastTap.current = null;
  }, [src]);

  /** Szerokość w px CSS dająca skalę 1:1 w pikselach urządzenia. */
  function nativeCssWidth(): number {
    const natural = imgRef.current?.naturalWidth ?? width;
    return Math.round(natural / (window.devicePixelRatio || 1));
  }

  /** Położenie punktu względem zawartości zdjęcia, niezależnie od przewinięcia. */
  function pointRatio(clientX: number, clientY: number) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  }

  /** Przechodzi na zadany stopień i ustawia kadr na wskazanym punkcie. */
  function zoomTo(next: number, ratio: { x: number; y: number }) {
    setStep(next);
    setLens(null);

    requestAnimationFrame(() => {
      const box = scrollRef.current;
      if (!box) return;
      box.scrollLeft = ratio.x * box.scrollWidth - box.clientWidth / 2;
      box.scrollTop = ratio.y * box.scrollHeight - box.clientHeight / 2;
    });
  }

  const nextStep = (from: number) => (from + 1) % (ZOOM_STEPS.length + 1);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    pressStart.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    // Mysz ma soczewkę i przycisk, więc gest zostawiamy dotykowi i rysikowi.
    if (e.pointerType === 'mouse') return;

    // Przeciąganie kadru kończy się tym samym zdarzeniem co dotknięcie.
    // Bez tego przesunięcie palcem liczyłoby się jako pierwsze tapnięcie
    // i kolejne dotknięcie zmieniałoby powiększenie bez powodu.
    const start = pressStart.current;
    pressStart.current = null;
    const dragged =
      start !== null &&
      (Math.abs(e.clientX - start.x) > DOUBLE_TAP_PX ||
        Math.abs(e.clientY - start.y) > DOUBLE_TAP_PX);

    if (dragged) {
      lastTap.current = null;
      return;
    }

    const now = performance.now();
    const prev = lastTap.current;
    const isDouble =
      prev !== null &&
      now - prev.t < DOUBLE_TAP_MS &&
      Math.abs(e.clientX - prev.x) < DOUBLE_TAP_PX &&
      Math.abs(e.clientY - prev.y) < DOUBLE_TAP_PX;

    if (isDouble) {
      lastTap.current = null;
      zoomTo(nextStep(step), pointRatio(e.clientX, e.clientY));
      return;
    }

    lastTap.current = { t: now, x: e.clientX, y: e.clientY };
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const img = imgRef.current;
    if (!img || !hoverLens || step > 0 || lensLevel === 0) return;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLens(null);
      return;
    }

    // Ile pikseli pliku przypada na piksel ekranu, przemnożone przez wybrany
    // stopień powiększenia soczewki.
    const scale = (img.naturalWidth / rect.width) * LENS_LEVELS[lensLevel - 1];

    setLens({
      x,
      y,
      bgX: -(x * scale - LENS_SIZE / 2),
      bgY: -(y * scale - LENS_SIZE / 2),
    });
  }

  const cycleLens = () => {
    setLensLevel((v) => (v + 1) % (LENS_LEVELS.length + 1));
    setLens(null);
  };

  // Skrót klawiszowy, żeby nie trzeba było celować w przycisk przy każdym zdjęciu.
  useEffect(() => {
    if (!hoverLens) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        cycleLens();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hoverLens]);

  const zoomed = step > 0;
  const zoomWidth = zoomed ? nativeCssWidth() * ZOOM_STEPS[step - 1] : undefined;

  const buttonLabel =
    step === 0 ? 'Powiększ' : step < ZOOM_STEPS.length ? 'Powiększ mocniej' : 'Dopasuj do ekranu';

  const hint = zoomed
    ? `Powiększenie ${step} z ${ZOOM_STEPS.length}. Przesuwaj palcem, dotknij dwukrotnie żeby zmienić.`
    : hoverLens
      ? lensLevel > 0
        ? `Lupka ${LENS_LEVELS[lensLevel - 1]}x podąża za kursorem. Klawisz L zmienia powiększenie.`
        : 'Włącz lupkę przyciskiem albo klawiszem L. Podwójne kliknięcie powiększa całe zdjęcie.'
      : 'Dotknij dwukrotnie w miejscu, które chcesz obejrzeć z bliska';

  return (
    <div className={styles.root}>
      <div
        ref={scrollRef}
        className={`${styles.viewport} ${zoomed ? styles.zoomed : ''}`}
        onMouseMove={onMove}
        onMouseLeave={() => setLens(null)}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onDoubleClick={(e) => zoomTo(nextStep(step), pointRatio(e.clientX, e.clientY))}
      >
        <img
          ref={imgRef}
          className={styles.image}
          src={src}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          style={zoomed ? { width: zoomWidth, maxWidth: 'none', maxHeight: 'none' } : undefined}
        />

        {lens && (
          <div
            className={styles.lens}
            aria-hidden="true"
            style={{
              left: lens.x,
              top: lens.y,
              width: LENS_SIZE,
              height: LENS_SIZE,
              backgroundImage: `url("${src}")`,
              // Tło w naturalnych wymiarach pliku daje skalę 1:1; mnożnik
              // wybranego stopnia powiększa je dalej.
              backgroundSize: (() => {
                const f = LENS_LEVELS[Math.max(0, lensLevel - 1)];
                return `${(imgRef.current?.naturalWidth ?? width) * f}px ${(imgRef.current?.naturalHeight ?? height) * f}px`;
              })(),
              backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
            }}
          />
        )}
      </div>

      <div className={styles.controls}>
        {hoverLens && (
          <button
            type="button"
            className={lensLevel > 0 ? styles.zoomToggle : styles.zoomReset}
            onClick={cycleLens}
            aria-pressed={lensLevel > 0}
            title="Klawisz L"
          >
            {lensLevel === 0 ? 'Lupka' : `Lupka ${LENS_LEVELS[lensLevel - 1]}x`}
          </button>
        )}

        <button
          type="button"
          className={styles.zoomToggle}
          onClick={() => zoomTo(nextStep(step), { x: 0.5, y: 0.5 })}
        >
          {buttonLabel}
        </button>
        {zoomed && (
          <button
            type="button"
            className={styles.zoomReset}
            onClick={() => zoomTo(0, { x: 0.5, y: 0.5 })}
          >
            Dopasuj
          </button>
        )}
      </div>

      <p className={styles.hint}>{hint}</p>
    </div>
  );
}
