import { useRef, useState, type MouseEvent } from 'react';
import styles from './MagnifierImage.module.css';

interface Props {
  src: string;
  alt: string;
  width: number;
  height: number;
  enabled: boolean;
}

const LENS_SIZE = 200;

/**
 * Zdjęcie z lupką podążającą za kursorem.
 *
 * Lupka pokazuje piksele w skali 1:1 wobec pliku źródłowego, a nie stałe 2,5x.
 * Pliki mają 1920 px szerokości, więc przy podglądzie rozciągniętym na około
 * 1100 px realne powiększenie wynosi mniej więcej 1,7x. Wymuszenie 2,5x
 * dorysowałoby detal, którego w źródle nie ma - lupka byłaby efektowna, ale
 * kłamałaby przy ocenie ostrości, czyli dokładnie tam, gdzie ma pomagać.
 *
 * Na urządzeniach dotykowych lupka jest wyłączona: nie ma kursora, za którym
 * miałaby podążać, a przeglądarka i tak daje pinch-zoom.
 */
export function MagnifierImage({ src, alt, width, height, enabled }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number; bgX: number; bgY: number } | null>(null);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const img = imgRef.current;
    if (!img || !enabled) return;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setLens(null);
      return;
    }

    // Ile pikseli pliku przypada na piksel ekranu. Poniżej 1 obraz jest
    // wyświetlany w powiększeniu i lupka nie miałaby czego dołożyć.
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
    <div
      className={styles.root}
      onMouseMove={onMove}
      onMouseLeave={() => setLens(null)}
    >
      <img
        ref={imgRef}
        className={styles.image}
        src={src}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
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
  );
}
