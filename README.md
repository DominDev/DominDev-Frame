# Frame

Aplikacja do wyboru zdjęć z rodzinnej sesji fotograficznej. Pięć osób ocenia zdjęcia
niezależnie, admin zbiera wyniki i na tej podstawie wybiera kadry do obróbki.

**Adres aplikacji:** https://domindev.github.io/DominDev-Frame/

---

## Dla rodziny

Wchodzisz na powyższy link, logujesz się adresem e-mail i hasłem, które dostałeś.
Oceniasz zdjęcia w skali od 1 do 5:

| Ocena | Znaczenie |
|---|---|
| 1 | odrzucam |
| 2 | raczej nie |
| 3 | możliwe |
| 4 | bardzo dobre |
| 5 | koniecznie wybierz |

Ocenę możesz zmienić w każdej chwili. Zdjęcia możesz komentować (komentarze widzą
wszyscy) i dodawać do ulubionych (te widzisz tylko Ty).

Najszybszy sposób na przejrzenie całej sesji to **tryb skupienia**: jedno zdjęcie na
pełnym ekranie, ocena klawiszami 1-5, przechodzenie strzałkami.

Hasło zmienisz w menu pod swoim imieniem.

---

## Dla admina

### Struktura projektu

```
_source/       zdjęcia źródłowe (poza gitem) - tutaj wrzucasz pliki z sesji
_processed/    wynik przetwarzania (poza gitem) - miniatury, wersje pełne, mapping.csv
docs/specs/    specyfikacja projektowa
scripts/       narzędzia administracyjne uruchamiane lokalnie
src/           kod aplikacji
```

### Przygotowanie i wysłanie zdjęć

```bash
npm run photos:prepare
npm run photos:upload
```

Pierwsza komenda czyta `_source/`, tworzy miniatury i skompresowane wersje webp,
usuwa EXIF i zapisuje `_processed/mapping.csv` z parami nazwa pliku > ścieżka źródłowa.
Druga wysyła pliki do Firebase Storage i zapisuje manifest w bazie.

### Zmiana hasła użytkownikowi

```bash
npm run user:password -- <adres-email> <nowe-haslo>
```

Wymaga klucza konta usługi w `%USERPROFILE%\.frame\service-account.json`.
Klucz nigdy nie trafia do repozytorium.

### Raporty

Panel admina w aplikacji udostępnia raport ocen (posortowany po średniej, z eksportem CSV
i kopiowaniem samej listy nazw plików) oraz raport ulubionych z informacją, kto co wybrał.

---

## Stack

Vite + React + TypeScript, Firebase (Auth, Firestore, Storage), hosting na GitHub Pages.
Szczegóły architektury i uzasadnienie decyzji: [docs/specs](docs/specs/2026-08-04-frame-design.md).
