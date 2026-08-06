import { extname } from 'node:path';

const normalized = (value) => String(value).normalize('NFC').toLocaleLowerCase('pl-PL');

export function fileStem(name) {
  const extension = extname(name);
  return name.slice(0, name.length - extension.length);
}

/**
 * Dopasowuje pliki po obróbce do manifestu źródłowego.
 * Pełna nazwa ma pierwszeństwo, a nazwa bez rozszerzenia jest bezpiecznym fallbackiem.
 */
export function mapEditedFiles(editedNames, originals) {
  const problems = [];
  const mapped = [];
  const seenEdited = new Set();
  const usedPhotoIds = new Set();
  const exact = new Map();
  const stems = new Map();

  for (const photo of originals) {
    const exactKey = normalized(photo.name);
    const stemKey = normalized(fileStem(photo.name));
    exact.set(exactKey, [...(exact.get(exactKey) ?? []), photo]);
    stems.set(stemKey, [...(stems.get(stemKey) ?? []), photo]);
  }

  for (const editedName of [...editedNames].sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }))) {
    const editedKey = normalized(editedName);
    if (seenEdited.has(editedKey)) {
      problems.push(`Plik po obróbce występuje więcej niż raz: ${editedName}`);
      continue;
    }
    seenEdited.add(editedKey);

    const exactMatches = exact.get(editedKey) ?? [];
    const stemMatches = stems.get(normalized(fileStem(editedName))) ?? [];
    const candidates = exactMatches.length > 0 ? exactMatches : stemMatches;
    const method = exactMatches.length > 0 ? 'exact' : 'stem';

    if (candidates.length === 0) {
      problems.push(`Brak zdjęcia źródłowego dla: ${editedName}`);
      continue;
    }

    if (candidates.length > 1) {
      problems.push(
        `Niejednoznaczna nazwa ${editedName}: ${candidates.map((p) => p.name).join(', ')}`
      );
      continue;
    }

    const original = candidates[0];
    if (usedPhotoIds.has(original.id)) {
      problems.push(`Dwa pliki po obróbce wskazują zdjęcie: ${original.name}`);
      continue;
    }
    usedPhotoIds.add(original.id);

    mapped.push({
      editedName,
      originalName: original.name,
      photoId: original.id,
      method,
    });
  }

  return { mapped, problems };
}

/** Nowe wpisy zastępują tylko własne ID. Wcześniejsze obróbki pozostają w manifeście. */
export function mergeEditedPhotos(existing, incoming) {
  const byId = new Map(existing.map((photo) => [photo.photoId, photo]));
  for (const photo of incoming) byId.set(photo.photoId, photo);
  return [...byId.values()].sort(
    (a, b) =>
      a.originalName.localeCompare(b.originalName, 'pl', { numeric: true }) ||
      a.photoId.localeCompare(b.photoId)
  );
}

export function mappingCsv(mapped) {
  const quote = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [
    'nazwa_obrobiona,nazwa_zrodlowa,photo_id,metoda',
    ...mapped.map((item) =>
      [item.editedName, item.originalName, item.photoId, item.method].map(quote).join(',')
    ),
  ];
  return '\uFEFF' + lines.join('\r\n');
}
