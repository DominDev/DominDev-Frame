import type { EditedPhoto, Photo } from '../types';

export interface DisplayedPhotoVersion {
  kind: 'original' | 'edited';
  width: number;
  height: number;
  edited: EditedPhoto | null;
}

/**
 * Wersja po obróbce jest aktywna tylko dla dokładnie wskazanego zdjęcia.
 * Zmiana zdjęcia automatycznie wraca dzięki temu do wersji źródłowej.
 */
export function resolvePhotoVersion(
  photo: Photo,
  edited: EditedPhoto | undefined,
  requestedEditedPhotoId: string | null
): DisplayedPhotoVersion {
  if (edited && requestedEditedPhotoId === photo.id) {
    return { kind: 'edited', width: edited.w, height: edited.h, edited };
  }

  return { kind: 'original', width: photo.w, height: photo.h, edited: null };
}
