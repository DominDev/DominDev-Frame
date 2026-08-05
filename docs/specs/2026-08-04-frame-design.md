# Frame - specyfikacja projektowa

Data: 2026-08-04
Status: zatwierdzona, gotowa do implementacji

Aplikacja webowa do wyboru zdjęć z rodzinnej sesji fotograficznej. Pięć osób ocenia
niezależnie około 600 zrzutów, admin zbiera wyniki i na tej podstawie wybiera
zdjęcia do dalszej obróbki.

---

## 1. Kontekst i ograniczenia

- Narzędzie jednorazowe lub dwurazowe, dla pięciu znanych osób, dostępne z bezpośredniego linku.
- Priorytetem jest przyjazny, intuicyjny interfejs dla użytkowników nietechnicznych, a nie
  wydajność, SEO czy rozbudowane bezpieczeństwo.
- Hosting: GitHub Pages, czyli wyłącznie pliki statyczne. Cały stan współdzielony musi
  mieszkać w usłudze zewnętrznej.

### Użytkownicy

Pięć kont zakładanych z góry w konsoli Firebase: Paweł (admin + użytkownik),
Aleksandra, Damian, Renata, Jerzy.

Adresy e-mail nie znajdują się w tym repozytorium ani w kodzie frontendu. Repozytorium
jest publiczne, a publikowanie prywatnych adresów nie daje żadnej korzyści. Front zna
wyłącznie mapę UID > imię i rola; adresy istnieją tylko w Firebase Auth i w prywatnych
notatkach admina.

---

## 2. Nazwa i lokalizacja

- Aplikacja: **Frame**
- Repo lokalne: `D:\ProgramData\DominDev\DominDev-Frame`
- Repo zdalne: `github.com/DominDev/DominDev-Frame`, organizacja DominDev, **publiczne**
  (darmowy plan organizacji udostępnia Pages tylko z repozytoriów publicznych)
- Adres: `https://domindev.github.io/DominDev-Frame/`
- Opcjonalnie później: `frame.domindev.com` przez CNAME

Aplikacja działa w podkatalogu, nie w korzeniu domeny, więc build używa
`base: '/DominDev-Frame/'`, a nawigacja opiera się na hashu (hash nie wymaga
przepisywania 404 na GitHub Pages).

Do repozytorium trafia wyłącznie kod. Żadne zdjęcie nigdy nie wchodzi do gita.

---

## 3. Architektura

```
Przeglądarka  ->  GitHub Pages (domindev.github.io/DominDev-Frame/, sam kod)
      |
      +-- Firebase Auth        logowanie e-mail + hasło, zmiana własnego hasła
      +-- Cloud Firestore      manifest zdjęć, oceny, ulubione, komentarze (na żywo)
      +-- Firebase Storage     bucket us-central1, 600 x 2 pliki webp

Komputer admina  ->  Admin SDK (skrypty lokalne, klucz poza repozytorium)
                     przetwarzanie, upload, manifest, hasła
```

### Uzasadnienie wyboru

**Dlaczego backend-as-a-service, a nie własny serwer.** GitHub Pages serwuje wyłącznie
pliki statyczne. Firebase daje autentykację, bazę czasu rzeczywistego i storage w jednym
ekosystemie, z jednym tokenem i jednym zestawem reguł, bez utrzymywania czegokolwiek.

**Dlaczego Firebase, a nie Supabase.** Darmowy projekt Supabase jest pauzowany po około
siedmiu dniach bezczynności. Przy narzędziu używanym sporadycznie oznaczałoby to, że
rodzina trafia na martwą stronę.

**Dlaczego Storage, a nie zdjęcia w repozytorium.** Repozytorium musi być publiczne, żeby
Pages działało na darmowym planie. Zdjęcia w repo byłyby dostępne bez logowania i zostałyby
w historii gita na zawsze, bo usunięcie plików kolejnym commitem nie usuwa ich z wcześniejszych
commitów.

### Dostęp do zdjęć

Bucket nie pozwala na publiczne listowanie ani zwykły odczyt: reguły Storage odrzucają
wszystko. Konkretne pliki są dostępne przez trudne do odgadnięcia, **odwoływalne linki
tokenowe**. Taki link jest w praktyce kluczem na okaziciela: kto go zna, pobierze plik bez
logowania, niezależnie od reguł, aż do unieważnienia tokenu.

Manifest z tokenami leży w Firestore za regułami, nie w statycznym pliku, więc osoba
niezalogowana nie zdobędzie żadnego adresu.

Wariant w pełni szczelny (pobieranie obiektów jako `Blob` przez SDK, z autoryzacją, dopiero
przy zbliżeniu do viewportu) został rozważony i odrzucony ze względu na złożoność zarządzania
adresami `blob:` i cache, nie ze względu na liczbę żądań.

### Region i opóźnienia

Bucket w `us-central1`, bo Always Free dla Cloud Storage obowiązuje wyłącznie w `us-east1`,
`us-west1` i `us-central1`. Firestore ma darmowy próg niezależny od regionu, ale musi być
w tej samej lokalizacji domyślnej co domyślny bucket, więc również `us-central1` (regionalny,
nie multi-region `nam5`, bo multi-region nie kwalifikuje się do Always Free).

Kosztem jest około 110-130 ms dodatkowego opóźnienia. Nie mnoży się przez 600, bo pliki idą
jednym połączeniem HTTP/2 ze zwielokrotnianiem. Zapisy ocen są maskowane optymistyczną
aktualizacją interfejsu: gwiazdka zapala się natychmiast, zapis potwierdza się w tle.

---

## 4. Identyfikatory i nazwy plików

To jest oś projektu: cała ścieżka od raportu do pliku na dysku musi być czytelna dla człowieka.

```
D:\...\_source\sesja\6U2A7358.png          plik na dysku
   |
   |  prepare-photos.mjs
   v
id:    "6U2A7358_png"                      klucz w bazie i w ścieżkach Storage
name:  "6U2A7358.png"                      DOKŁADNA nazwa pokazywana wszędzie
src:   "sesja\6U2A7358.png"                zapisane w mapping.csv
   |
   v
photos/thumb/6U2A7358_png.webp
photos/full/6U2A7358_png.webp
```

### Reguła nadrzędna

> `id` musi zależeć wyłącznie od samego pliku, nigdy od reszty zbioru.

Dlatego rozszerzenie doklejane jest **zawsze**, a nie dopiero przy wykrytej kolizji. Wariant
warunkowy ma ukrytą wadę: gdy w folderze jest sam `IMG_001.png` i dostaje `IMG_001`, a
tydzień później dochodzi `IMG_001.jpg`, obydwa potrzebują rozszerzenia i istniejące zdjęcie
zmienia identyfikator, gubiąc swoje oceny i komentarze.

### Algorytm

1. `base` = nazwa bez ostatniego rozszerzenia, `ext` = ostatnie rozszerzenie.
2. Każdy znak spoza `[A-Za-z0-9_-]` zamieniany na `_`.
3. `id = base + '_' + ext`.
4. Awaryjnie, przy kolizji `id`: dopisany krótki hash ścieżki względnej (`..._png__a83f19`).
   Gałąź obronna, w praktyce nieosiągalna, bo duplikat nazwy wyświetlanej przerywa pracę.

```
6U2A7358.png     -> 6U2A7358_png
sesja.final.png  -> sesja_final_png
IMG_001.png      -> IMG_001_png
IMG_001.jpg      -> IMG_001_jpg
```

### Kontrole skryptu

| Sytuacja | Reakcja |
|---|---|
| Duplikat pełnej ścieżki | pominięcie |
| **Duplikat nazwy wyświetlanej** | **przerwanie pracy** z wypisaniem obu ścieżek |
| Nazwy różniące się tylko wielkością liter | **przerwanie pracy** (Windows ich nie odróżnia) |
| Kolizja wygenerowanego `id` | sufiks z hashu ścieżki + ostrzeżenie |

### Nazwa w interfejsie

`name` jest niezmienne i widoczne wszędzie: pod kafelkiem, w nagłówku trybu skupienia, w obu
raportach, w CSV i na liście kopiowanej do schowka. Zawsze z rozszerzeniem, w oryginalnej
pisowni, bez skracania. W podglądzie nazwa jest przyciskiem kopiującym ją do schowka.

Sortowanie: `Intl.Collator('pl', { numeric: true, sensitivity: 'base' })`, dzięki czemu
`6U2A798` wypada przed `6U2A7358`, a nie odwrotnie jak przy sortowaniu tekstowym.

`_processed/mapping.csv` zawiera pary `name` > pełna ścieżka źródłowa, na wypadek gdyby
z raportem w ręku nie udało się znaleźć pliku.

---

## 5. Model danych

### Storage

```
photos/thumb/{id}.webp
photos/full/{id}.webp
```

### Firestore

**Identyfikator bazy: `frame-db`**, a nie `(default)`. Baza została utworzona jako nazwana,
co ma dwie konsekwencje w kodzie: klient inicjalizuje ją przez `getFirestore(app, 'frame-db')`,
a wgrywanie reguł wymaga wskazania bazy w `firebase.json`. Darmowy próg przysługuje pierwszej
bazie w projekcie, więc obejmuje tę. Poza tym zachowuje się identycznie jak domyślna.

| Kolekcja | Dokument | Zawartość | Odczyt | Zapis |
|---|---|---|---|---|
| `manifest` | `chunk-000..002` | tablica `{ id, name, w, h, tThumb, tFull }`, po 250 zdjęć | zalogowani | tylko skrypt admina |
| `ratings` | `{uid}` | `{ "6U2A7358_png": 4, ... }` | zalogowani | tylko właściciel |
| `favorites` | `{uid}` | `{ "6U2A7358_png": true, ... }` | właściciel + admin | tylko właściciel |
| `comments` | auto-id | `{ photoId, uid, text, createdAt, editedAt }` | zalogowani | autor; kasuje autor lub admin |

Oceny każdej osoby siedzą w jednym dokumencie zamiast w 3000 osobnych. Wczytanie aplikacji
to 3 + 5 + 1 + komentarze odczytów zamiast tysięcy, średnie liczone są w przeglądarce,
a zmiana oceny to zapis jednego pola. Dokument z 600 kluczami waży około 20 KB przy limicie
1 MiB.

Oceny wszystkich muszą być odczytywalne przez wszystkich, bo średnia liczy się po stronie
klienta. Ulubione są ograniczone do właściciela i admina.

Pola z tokenami dostają wyjątek indeksowania: nikt po nich nie szuka, a niepotrzebnie
zwiększałyby rozmiar indeksów.

### Konfiguracja użytkowników

```ts
export const USERS: Record<string, { name: string; role: 'admin' | 'user' }> = {
  'UID_PAWLA':      { name: 'Paweł',      role: 'admin' },
  'UID_ALEKSANDRY': { name: 'Aleksandra', role: 'user'  },
  // ...
};
```

Rola w tej mapie służy wyłącznie do decyzji, co narysować. Uprawnienia egzekwują reguły bazy.

---

## 6. Funkcje

### Każdy użytkownik

- Logowanie e-mailem i hasłem, sesja zapamiętana między wizytami.
- Zmiana własnego hasła: min. 8 znaków, wielka i mała litera, znak specjalny, walidacja
  na żywo pokazująca czego brakuje. Obsłużony przypadek, w którym Firebase żąda ponownego
  podania obecnego hasła przy starej sesji.
- Galeria-siatka: miniatura, nazwa pliku, moja ocena, średnia, licznik komentarzy,
  serce ulubionych.
- Tryb skupienia: jedno zdjęcie na pełnym ekranie, ocena klawiszami `1`-`5`, nawigacja
  strzałkami lub gestem, `F` ulubione, `C` komentarz, `Esc` wyjście, prefetch trzech
  kolejnych zdjęć.
- Lupa: okrągła soczewka podążająca za kursorem, powiększenie 2× z pliku
  pełnej rozdzielczości. Na telefonie zamiast lupy działa dwuklik i przewijanie palcem.
- Ocena 1-5 z opisami: 1 odrzucam, 2 raczej nie, 3 możliwe, 4 bardzo dobre,
  5 koniecznie wybierz. Zmienialna w każdej chwili, z cofnięciem do "brak oceny".
- Średnia zasłonięta do momentu oddania własnego głosu, potem widoczna na stałe razem
  z liczbą głosów, np. `4,2 / 5 (3 głosy)`. Wymóg widocznej średniej jest spełniony,
  a założenie o niezależnym ocenianiu przestaje być fikcją.
- Komentarze widoczne dla wszystkich, podpisane imieniem, z datą, limit 1000 znaków,
  edycja i kasowanie własnych.
- Ulubione widoczne dla właściciela i admina, niewidoczne dla reszty.
- Pasek postępu "Oceniłeś 137 z 600" i przycisk "Skocz do pierwszego nieocenionego".

### Filtry i sortowanie

- Wyszukiwanie po pełnej nazwie pliku lub dowolnym jej fragmencie, łączone z innymi filtrami
- Zakładki: Wszystkie / Nieocenione przeze mnie / Moje ulubione / Skomentowane
- Filtr mojej oceny: dokładnie 5, 4 i więcej, 3 i mniej
- Filtr średniej: 4,5+, 4+, 3+
- Sortowanie: nazwa pliku (domyślne), średnia malejąco, liczba ocen, najnowszy komentarz
- Licznik wyników, czyszczenie filtrów, stan zapisany w URL

### Admin, dodatkowo

- **Raport ocen**: tabela wszystkich zdjęć posortowana po średniej malejąco, z nazwą pliku,
  oceną każdej osoby osobno i liczbą głosów. Eksport CSV oraz przycisk kopiujący samą listę
  nazw (`6U2A7358.png` w każdej linii).
- **Raport ulubionych**: zdjęcia ulubione z informacją kto je wybrał, plus przekrój
  "wybrane przez co najmniej 2 osoby".
- Podgląd postępu każdej osoby.
- Przełącznik "pokaż wszystkie średnie" ignorujący zasłonę.
- Zmiana hasła dowolnej osobie lokalnym skryptem.

---

## 7. Design i UX

Neutralnie szare tło galerii, chromatycznie zerowe, żeby nie przesuwało postrzegania balansu
bieli. Podgląd pełnoekranowy na grafitowym tle. Jeden akcent, bursztyn, wyłącznie na gwiazdki
i aktywne działania. Stonowana czerwień tylko na ulubione. Tekst 17-18 px, bo ocenia też
starsze pokolenie. Cele dotykowe minimum 44 x 44 px. Ruch ograniczony i funkcjonalny,
z obsługą `prefers-reduced-motion`.

Layout: nagłówek z imieniem, paskiem postępu i wyjściem; przyklejony pasek filtrów; siatka
kafelków 2 kolumny na telefonie, 3-4 na tablecie, 5-6 na monitorze.

Na desktopie gwiazdki są bezpośrednio na kafelku. Na telefonie kafelek pokazuje tylko
plakietkę z oceną, a ocenianie odbywa się w trybie skupienia z dużymi przyciskami, bo pięć
drobnych gwiazdek na małym kafelku to porażka użyteczności.

Podgląd: zdjęcie na lewych dwóch trzecich, po prawej panel z oceną, ulubionymi i komentarzami.
Na telefonie zdjęcie zajmuje około 64% wysokości ekranu i zachowuje pełny kadr niezależnie
od orientacji, a panel znajduje się poniżej. Każda akcja zapisuje się natychmiast, bez przycisku
zatwierdzania, ze znikającym potwierdzeniem.

Semantyczny HTML: `<main>`, `<header>`, `<nav>`, `<figure>` i `<figcaption>` na kafelku,
`<dialog>` na podglądzie, `<fieldset>` z `<input type="radio">` pod gwiazdkami (klawiatura
i czytniki ekranu działają bez dopisywania ARIA), `<time datetime>` przy komentarzach.
Kontrast tekstu powyżej 4,5:1, widoczny focus, pełna obsługa klawiaturą.

---

## 8. Stack i struktura plików

Vite + React + TypeScript. Firebase JS SDK w aktualnej stabilnej wersji z dnia implementacji,
zamrożonej w `package-lock.json`, importowany modularnie: **tylko `auth` i `firestore`**.
Front nie potrzebuje `firebase/storage`, bo zdjęcia ładują się zwykłym `<img src>` z adresów
tokenowych zapisanych w manifeście; ze Storage rozmawiają wyłącznie skrypty administracyjne
przez Admin SDK. CSS Modules z plikiem tokenów. Bez routera: trzy widoki na stanie i hashu.

```
DominDev-Frame/
├─ .github/workflows/deploy.yml     build z base=/DominDev-Frame/, kontrola rozmiaru, deploy
├─ _source/                         (gitignore) pliki źródłowe
├─ _processed/                      (gitignore) thumb/, full/, mapping.csv
├─ docs/specs/                      ta specyfikacja
├─ scripts/
│  ├─ prepare-photos.mjs            sharp: webp, miniatury, EXIF, wymiary, kolizje, mapping.csv
│  ├─ upload-photos.mjs             wysyłka do bucketu + manifest do Firestore
│  └─ set-user-password.mjs         Admin SDK: hasło dowolnej osobie
├─ firestore.rules
├─ storage.rules
├─ src/
│  ├─ config/{firebase,users,constants}.ts
│  ├─ lib/{auth,db,photos,stats,password,csv,sort}.ts
│  ├─ hooks/{useAuth,useManifest,useRatings,useFavorites,useComments,useFilters}.ts
│  ├─ components/
│  │  ├─ auth/      LoginForm, ChangePasswordDialog
│  │  ├─ layout/    AppHeader, ProgressBar, Toast
│  │  ├─ gallery/   GalleryGrid, PhotoCard, FilterBar, LoadMore
│  │  ├─ viewer/    PhotoViewer, MagnifierImage, ViewerPanel, FileNameChip
│  │  ├─ rating/    StarRating, FavoriteButton
│  │  ├─ comments/  CommentList, CommentForm
│  │  └─ admin/     AdminPanel, RatingReport, FavoritesReport, ProgressReport
│  └─ styles/tokens.css, global.css
└─ README.md
```

`lib/stats.ts` to czyste funkcje liczące średnie i filtrujące. Hooki trzymają połączenie
z Firestore. Komponenty tylko rysują.

---

## 9. Bezpieczeństwo

UID admina wpisany wprost do `firestore.rules` i `storage.rules`. Front zna rolę tylko po to,
żeby wiedzieć co narysować; uprawnienia egzekwuje baza.

Reguły sprawdzają dodatkowo:

- ocena jest liczbą całkowitą 1-5 albo polem usuwanym,
- komentarz ma limit 1000 znaków,
- dokumenty przyjmują wyłącznie zadeklarowane pola,
- `uid` w zapisie zgadza się z zalogowanym,
- `manifest` jest dla frontu tylko do odczytu.

Storage odrzuca odczyt i listowanie; dostęp idzie wyłącznie przez tokeny z manifestu.

Klucz konta usługi: `%USERPROFILE%\.frame\service-account.json`, fizycznie poza repozytorium.
Hasła początkowe nie trafiają do repozytorium, README ani logów CI.

W Firebase Auth do dozwolonych domen dopisujemy `domindev.github.io`.

### Checklista weryfikacji reguł

Do przejścia ręcznie z dwóch kont przed przekazaniem aplikacji rodzinie.

1. Niezalogowany nie odczyta manifestu ani żadnej kolekcji.
2. Zwykły użytkownik nie zapisze cudzego dokumentu ocen.
3. Oceny `0`, `6`, `3.5` i tekst zostają odrzucone.
4. Użytkownik nie odczyta cudzych ulubionych.
5. Admin odczyta wszystkie ulubione.
6. Komentarz nie może mieć cudzego `uid`.
7. Użytkownik nie usunie cudzego komentarza.
8. Admin usunie dowolny komentarz.
9. Front nie zapisze niczego do `manifest`.
10. Plik ze Storage nie otworzy się bez tokenu, a z tokenem otwiera się bez logowania
    (potwierdzenie przyjętego modelu, nie usterka).
11. Autor edytuje tekst komentarza, ale nie podmieni `uid`, `photoId` ani `createdAt`.
12. Komentarz powyżej 1000 znaków zostaje odrzucony.
13. Zwykły użytkownik nie doda nieprzewidzianych pól do komentarza ani do ulubionych.

---

## 10. Wydajność, rozmiar i koszt

Miniatura 400 px webp q72, około 20 KB. Wersja pełna `min(oryginał, 2560)` px webp q82,
**bez upscalingu**, bo skrypt nie stworzy detalu, którego w źródle nie ma. EXIF usuwany.
Szacunek 130-260 MB, dokładna liczba po zmierzeniu plików źródłowych.

Galeria renderuje partiami po 100 kafelków z doładowywaniem przy scrollu, bo 600 kafelków
to około 3000 pól radio. Miniatury z `loading="lazy"` i zadeklarowanymi proporcjami, żeby
nic nie skakało przy scrollu. Wersja pełna ładuje się dopiero w podglądzie. Komentarze
jednym zbiorczym odczytem po pierwszym wyrenderowaniu galerii, bo licznik na kafelku
i filtr "skomentowane" wymagają wiedzy o wszystkich.

### Koszt

| Limit Always Free | Szacowane zużycie | Zapas |
|---|---|---|
| 5 GB przechowywania | 0,26 GB | 19x |
| 5 000 operacji Class A / mies. | 1 200 przy jednorazowej wysyłce | 4x |
| 50 000 operacji Class B / mies. | około 6 000 na jedno pełne przejrzenie przez wszystkich | 8x |
| 100 GB transferu z Ameryki Północnej | około 4 GB pesymistycznie | 25x |

Przy założonym użyciu koszt Storage powinien wynieść 0 zł, bo wszystkie oszacowane zasoby
mieszczą się w aktualnym Always Free z zapasem od 4x do 25x. **Nie jest to twarda gwarancja:**
Blaze nie ma limitu wydatków, ponowne przetwarzanie zwiększa operacje Class A, błąd w aplikacji
może wygenerować nadmiarowe żądania, linki tokenowe mogą trafić poza rodzinę, a ceny i limity
mogą się zmienić. Dlatego ustawiamy alerty budżetowe na 1 zł, 5 zł i 20 zł i monitorujemy
zużycie.

---

## 11. Świadome kompromisy

1. Link tokenowy do zdjęcia działa bez logowania dla każdego, kto go zna, aż do unieważnienia
   tokenu. Zalogowany domownik może go wynieść poza rodzinę.
2. Każdy zalogowany technicznie dosięgnie cudzych ocen przez konsolę przeglądarki, bo średnia
   liczy się po stronie klienta. Interfejs ich nie pokazuje. Ukrycie wymagałoby Cloud Functions.
3. Bucket w USA oznacza około 110-130 ms dodatkowego opóźnienia. W zamian całość mieści się
   w Always Free.
4. Blaze wymaga karty. Alert budżetowy ostrzega, ale nie zatrzymuje naliczania.
5. Repozytorium publiczne, bo tego wymaga darmowe Pages. Publiczny jest wyłącznie kod.
6. Brak testów reguł w emulatorze; zamiast tego trzynastopunktowa checklista ręczna.

---

## 12. Etapy

| Etap | Kto | Co |
|---|---|---|
| 1 | Paweł | Firebase: projekt, Blaze z alertami, Auth, 5 kont, Firestore i bucket w `us-central1`, klucz konta usługi, config i UID-y |
| 2 | Claude | Szkielet Vite, workflow Pages, reguły, konfiguracja |
| 3 | Paweł + Claude | Zdjęcia do `_source\`, `npm run photos:prepare`, `npm run photos:upload` |
| 4 | Claude | Implementacja aplikacji |
| 5 | Paweł | `domindev.github.io` w dozwolonych domenach, wgranie reguł |
| 6 | Obaj | Test na telefonie i desktopie, checklista z punktu 9, przekazanie linku i haseł |
