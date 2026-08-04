import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Aplikacja jest publikowana na GitHub Pages pod adresem
 * https://domindev.github.io/DominDev-Frame/, czyli w podkatalogu, a nie
 * w korzeniu domeny. Bez `base` wszystkie odwołania do zasobów szukałyby ich
 * w korzeniu i strona po wdrożeniu byłaby pusta.
 */
export default defineConfig({
  base: '/DominDev-Frame/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Ostrzeżenie o rozmiarze paczki przy 600 kB zamiast domyślnych 500 kB:
    // SDK Firebase (auth + firestore) sam w sobie waży swoje.
    chunkSizeWarningLimit: 600,
  },
});
