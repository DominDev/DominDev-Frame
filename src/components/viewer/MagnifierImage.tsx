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

const LENS_SIZE = 200;

/**
 * Zdjęcie z dwoma sposobami powiększania, dobranymi do urządzenia.
 *
 * Na myszy: soczewka podążająca za kursorem.
 * Na dotyku: przełącznik "Powiększ", po którym zdjęcie da się przesuwać palcem.
 *
 * Oba warianty pokazują piksele w skali 1:1 wobec pliku, a nie stałe 2,5x.
 * Pliki mają 1920 px, więc przy podglądzie na 1100 px realne powiększenie to
 * około 1,7x. Wymuszenie większego dorysowałoby detal, którego w źródle nie ma -
 * powiększenie byłoby efektowne, ale kłamałoby przy ocenie ostrości, czyli
 * dokładnie tam, gdzie ma pomagać.
 *
 * Skala 1:1 liczona jest w pikselach urządzenia, nie CSS. Na telefonie z gęstym
 * ekranem (devicePixelRatio 3) obraz o szerokości 1920 px zajmuje 640 px CSS -
 * rozciągnięcie go na 1920 px CSS byłoby trzykrotnym powiększeniem pustki.
 */
export function MagnifierImage({ src, alt, width, height, hoverLens }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number; bgX: number; bgY: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);

  // Zmiana zdjęcia wraca do widoku dopasowanego - inaczej kolejne zdjęcie
  // otwierałoby się przewinięte w losowe miejsce.
  useEffect(() => {
    setZoomed(false);
    setLens(null);
  }, [src]);

  /** Szerokość w px CSS dająca skalę 1:1 w pikselach urządzenia. */
  function nativeCssWidth(): number {
    const natural = imgRef.current?.naturalWidth ?? width;
    return Math.round(natural / (window.devicePixelRatio || 1));
  }

  function enterZoom(ratioX: number, ratioY: number) {
    setZoomed(true);
    setLens(null);

    // Po przerysowaniu ustawiamy przewinięcie tak, żeby dotknięty fragment
    // znalazł się na środku ekranu.
    requestAnimationFrame(() => {
      const box = scrollRef.current;
      if (!box) return;
      box.scrollLeft = ratioX * box.scrollWidth - box.clientWidth / 2;
      box.scrollTop = ratioY * box.scrollHeight - box.clientHeight / 2;
    });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // Mysz ma soczewkę, więc przełącznik zostawiamy dotykowi i rysikowi.
    if (e.pointerType === 'mouse') return;

    const img = imgRef.current;
    if (!img) return;

    if (zoomed) {
      setZoomed(false);
      return;
    }

    const rect = img.getBoundingClientRect();
    enterZoom(
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    );
  }

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const img = imgRef.current;
    if (!img || !hoverLens || zoomed) return;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLens(null);
      return;
    }

    // Ile pikseli pliku przypada na piksel ekranu. Poniżej 1 obraz jest już
    // wyświetlany w powiększeniu i soczewka nie miałaby czego dołożyć.
    const scale = img.naturalWidth / rect.width;
    if (scale <= 1.05) {
      setLens(null);
      return;
    }

    setLens({
      x,
      y,
      bgX: -(x * scale - LENS_SIZE / 2),
      bgY: -(y * scale - LENS_SIZE / 2),
    });
  }

  return (
    <div className={styles.root}>
      <div
        ref={scrollRef}
        className={`${styles.viewport} ${zoomed ? styles.zoomed : ''}`}
        onMouseMove={onMove}
        onMouseLeave={() => setLens(null)}
        onPointerDown={onPointerDown}
      >
        <img
          ref={imgRef}
          className={styles.image}
          src={src}
          alt={alt}
          width={width}
          height={height}
          decoding="async"
          style={zoomed ? { width: nativeCssWidth(), maxWidth: 'none', maxHeight: 'none' } : undefined}
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
              // Rozmiar tła równy naturalnym wymiarom pliku daje skalę 1:1.
              backgroundSize: `${imgRef.current?.naturalWidth ?? width}px ${imgRef.current?.naturalHeight ?? height}px`,
              backgroundPosition: `${lens.bgX}px ${lens.bgY}px`,
            }}
          />
        )}
      </div>

      <button
        type="button"
        className={styles.zoomToggle}
        onClick={() => (zoomed ? setZoomed(false) : enterZoom(0.5, 0.5))}
        aria-pressed={zoomed}
      >
        {zoomed ? 'Dopasuj do ekranu' : 'Powiększ'}
      </button>

      <p className={styles.hint}>
        {zoomed
          ? 'Przesuwaj palcem, żeby obejrzeć fragmenty. Dotknij zdjęcia, żeby wrócić.'
          : hoverLens
            ? 'Najedź kursorem, żeby powiększyć fragment'
            : 'Dotknij zdjęcia w miejscu, które chcesz obejrzeć z bliska'}
      </p>
    </div>
  );
}
