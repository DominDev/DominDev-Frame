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

Średnia ocen odsłania się dopiero po wystawieniu własnej. Chodzi o to, żeby cudze
głosy nie sugerowały Ci Twojego.

### Jak obejrzeć szczegóły

**Na komputerze:** przycisk „Lupka" albo klawisz `L` włącza soczewkę podążającą za
kursorem. Kolejne naciśnięcia zmieniają powiększenie (1x, 2x, 3x) i wyłączają.
Podwójne kliknięcie powiększa całe zdjęcie.

**Na telefonie:** dotknij dwukrotnie w miejscu, które chcesz obejrzeć. Są dwa stopnie
powiększenia, trzecie dotknięcie wraca do całego kadru. Powiększone zdjęcie przesuwasz
palcem.

### Skróty klawiszowe

| Klawisz | Działanie |
|---|---|
| `1` - `5` | ocena |
| `←` `→` | poprzednie / następne zdjęcie |
| `F` | ulubione |
| `L` | lupka |
| `Esc` | zamknięcie podglądu |

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

Działa natychmiast i nie wymusza zmiany przy kolejnym logowaniu. Listę kont pokaże
`npm run user:password -- --list`.

### Wszystkie polecenia

| Polecenie | Do czego |
|---|---|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny (CI robi to sam przy każdym push) |
| `npm test` | testy logiki podglądu |
| `npm run typecheck` | kontrola typów |
| `npm run photos:prepare` | przetworzenie `_source/` na warianty webp |
| `npm run photos:upload` | wysyłka do Storage i zapis manifestu |
| `npm run user:password` | zmiana hasła dowolnej osobie |
| `npm run rules:deploy` | wgranie reguł bezpieczeństwa z walidacją składni |
| `npm run rules:verify` | 21 kontroli reguł na żywym projekcie |
| `npm run verify:firebase` | region bucketu, dostępność bazy, komplet kont |

Wszystkie skrypty administracyjne wymagają klucza konta usługi w
`%USERPROFILE%\.frame\service-account.json`. Klucz nigdy nie trafia do repozytorium -
`.gitignore` wyklucza także nazwę, którą nadaje mu konsola Firebase przy pobieraniu.

### Materiał źródłowy

Pliki w `_source/` to zrzuty ekranu galerii, w których sama fotografia zajmuje od 27 %
(kadr pionowy) do 51 % (kadr poziomy) powierzchni. Gdyby kiedyś udało się zdobyć
oryginalne pliki zamiast zrzutów, wystarczy podmienić zawartość `_source/` i uruchomić
oba polecenia `photos:*`. Oceny i komentarze przetrwają, bo identyfikator zdjęcia
bierze się z nazwy pliku.

### Raporty

Panel admina w aplikacji udostępnia raport ocen (posortowany po średniej, z eksportem CSV
i kopiowaniem samej listy nazw plików) oraz raport ulubionych z informacją, kto co wybrał.

---

## Stack

Vite + React + TypeScript, Firebase (Auth, Firestore, Storage), hosting na GitHub Pages.
Szczegóły architektury i uzasadnienie decyzji: [docs/specs](docs/specs/2026-08-04-frame-design.md).
