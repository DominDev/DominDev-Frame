import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import styles from './MagnifierImage.module.css';

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Lupa podążająca za kursorem ma sens wyłącznie tam, gdzie kursor istnieje. */
  hoverLens: boolean;
}

const LENS_SIZE = 260;
const LENS_SCALE = 2;
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

type ControlIconName = 'lens' | 'zoomIn' | 'zoomOut' | 'fit';

function ControlIcon({ name }: { name: ControlIconName }) {
  const path =
    name === 'lens' ? (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m15 15 4 4" />
      </>
    ) : name === 'zoomOut' ? (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="M8 10.5h5M15 15l4 4" />
      </>
    ) : name === 'fit' ? (
      <>
        <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" />
        <rect x="8" y="8" width="8" height="8" rx="1" />
      </>
    ) : (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="M10.5 8v5M8 10.5h5M15 15l4 4" />
      </>
    );

  return (
    <svg
      className={styles.controlIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}

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
  const [lensEnabled, setLensEnabled] = useState(
    () => Number(localStorage.getItem(LENS_KEY) ?? 0) > 0
  );
  useEffect(() => {
    localStorage.setItem(LENS_KEY, lensEnabled ? '1' : '0');
  }, [lensEnabled]);

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
    if (!img || !hoverLens || step > 0 || !lensEnabled) return;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLens(null);
      return;
    }

    // Ile pikseli pliku przypada na piksel ekranu, przemnożone przez stałe 2x.
    const scale = (img.naturalWidth / rect.width) * LENS_SCALE;

    setLens({
      x,
      y,
      bgX: -(x * scale - LENS_SIZE / 2),
      bgY: -(y * scale - LENS_SIZE / 2),
    });
  }

  const toggleLens = () => {
    setLensEnabled((enabled) => !enabled);
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
        toggleLens();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hoverLens]);

  const zoomed = step > 0;
  const zoomWidth = zoomed ? nativeCssWidth() * ZOOM_STEPS[step - 1] : undefined;

  const zoomButtonLabel =
    step === 0 ? 'Powiększ zdjęcie' : step < ZOOM_STEPS.length ? 'Powiększ bardziej' : 'Pomniejsz';
  const zoomButtonIcon: ControlIconName = step === ZOOM_STEPS.length ? 'zoomOut' : 'zoomIn';

  const changeZoom = () => {
    const next = step === ZOOM_STEPS.length ? step - 1 : step + 1;
    zoomTo(next, { x: 0.5, y: 0.5 });
  };

  const hint = zoomed
    ? hoverLens
      ? 'Użyj pasków przewijania, aby obejrzeć inny fragment zdjęcia. Dwuklik zmienia powiększenie.'
      : 'Przesuwaj zdjęcie palcem. Dotknij dwukrotnie, żeby zmienić powiększenie.'
    : hoverLens
      ? lensEnabled
        ? 'Lupa pokazuje szczegóły pod kursorem. Klawisz L ją wyłącza.'
        : 'Włącz lupę, aby obejrzeć fragment pod kursorem. Dwuklik powiększa całe zdjęcie.'
      : 'Dotknij zdjęcia dwukrotnie, żeby je powiększyć.';

  return (
    <div className={styles.root}>
      <div
        className={`${styles.controls} ${zoomed ? styles.controlsZoomed : ''}`}
        role="group"
        aria-label="Narzędzia zdjęcia"
      >
        {hoverLens && !zoomed && (
          <button
            type="button"
            className={lensEnabled ? styles.zoomToggle : styles.zoomReset}
            onClick={toggleLens}
            aria-pressed={lensEnabled}
            title="Skrót klawiszowy: L"
          >
            <ControlIcon name="lens" />
            {lensEnabled ? 'Wyłącz lupę' : 'Włącz lupę'}
          </button>
        )}

        <button type="button" className={styles.zoomToggle} onClick={changeZoom}>
          <ControlIcon name={zoomButtonIcon} />
          {zoomButtonLabel}
        </button>
        {zoomed && (
          <button
            type="button"
            className={styles.zoomReset}
            onClick={() => zoomTo(0, { x: 0.5, y: 0.5 })}
          >
            <ControlIcon name="fit" />
            Pokaż całe zdjęcie
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className={`${styles.viewport} ${zoomed ? styles.zoomed : ''}`}
        tabIndex={zoomed ? 0 : undefined}
        role={zoomed ? 'region' : undefined}
        data-photo-scroll-region={zoomed ? '' : undefined}
        aria-label={zoomed ? 'Powiększone zdjęcie - użyj klawiszy strzałek, aby je przewijać' : undefined}
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
              backgroundSize: `${(imgRef.current?.naturalWidth ?? width) * LENS_SCALE}px ${(imgRef.current?.naturalHeight ?? height) * LENS_SCALE}px`,
              backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
            }}
          />
        )}
      </div>

      <p className={styles.hint}>{hint}</p>
    </div>
  );
}
