/** Eksport raportów: CSV do pliku i zwykły tekst do schowka. */

const escapeCell = (value: string | number): string => {
  const s = String(value);
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Excel w polskiej wersji językowej rozdziela kolumny średnikiem, a bez BOM
 * pokazuje polskie znaki jako krzaki. Oba szczegóły decydują o tym, czy plik
 * otworzy się poprawnie po dwukliku.
 */
export function toCsv(rows: (string | number)[][]): string {
  return '﻿' + rows.map((r) => r.map(escapeCell).join(';')).join('\r\n');
}

export function downloadFile(fileName: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Kopiowanie do schowka z awaryjnym wariantem dla starszych przeglądarek. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Data i godzina w nazwie pliku raportu, żeby kolejne eksporty się nie nadpisywały. */
export function timestampForFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
