import { STORAGE_BUCKET } from '../config/firebase';
import type { Photo } from '../types';

/**
 * Adres pliku w Firebase Storage.
 *
 * Token w adresie jest kluczem na okaziciela: kto zna adres, pobierze plik bez
 * logowania, niezależnie od reguł Storage. Dlatego tokeny mieszkają w manifeście
 * w Firestore, za regułami - osoba niezalogowana nie zdobędzie żadnego adresu.
 *
 * Zwykły `<img src>` zamiast pobierania przez SDK daje działający cache
 * przeglądarki i eliminuje zależność od `firebase/storage` we froncie.
 */
export function photoUrl(photo: Photo, variant: 'thumb' | 'full'): string {
  const token = variant === 'thumb' ? photo.tThumb : photo.tFull;
  const path = encodeURIComponent(`photos/${variant}/${photo.id}.webp`);
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${path}?alt=media&token=${token}`;
}

/** Pobiera obrazek do cache przeglądarki, żeby kolejne zdjęcie pojawiło się od razu. */
export function prefetch(url: string): void {
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}
