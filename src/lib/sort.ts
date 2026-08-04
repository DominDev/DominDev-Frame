/**
 * Sortowanie nazw plików.
 *
 * `numeric: true` sprawia, że 6U2A798 wypada przed 6U2A7358. Zwykłe porównanie
 * tekstowe dałoby odwrotnie, bo znak po znaku "3" jest mniejsze niż "9".
 */
const collator = new Intl.Collator('pl', { numeric: true, sensitivity: 'base' });

export const compareNames = (a: string, b: string): number => collator.compare(a, b);
