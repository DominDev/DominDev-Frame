# Tutaj wrzucasz zdjęcia z sesji

Skopiuj do tego katalogu pliki zrzutów, na przykład `6U2A7358.png`.

## Zasady

- **Podkatalogi są dozwolone.** Skrypt przeszuka je rekurencyjnie.
- **Nazwy plików muszą być unikalne w całym drzewie.** Jeśli ten sam `6U2A7358.png`
  znajdzie się w dwóch podkatalogach, skrypt przerwie pracę i wypisze obie ścieżki.
  Powód: raport dla admina identyfikuje zdjęcia po nazwie pliku, więc dwie różne
  fotografie o tej samej nazwie uczyniłyby raport bezużytecznym.
- **Nazwy różniące się wyłącznie wielkością liter też są traktowane jak duplikat**
  (`IMG_1.PNG` i `img_1.png`), bo Windows i tak ich nie odróżnia przy wyszukiwaniu.
- **Oryginały nie są modyfikowane.** Skrypt wyłącznie je czyta.

## Co dalej

```bash
npm run photos:prepare
npm run photos:upload
```

Pierwsza komenda tworzy w `_processed/` miniatury i skompresowane wersje webp
oraz plik `mapping.csv` z parami: nazwa pliku > pełna ścieżka źródłowa.
Druga wysyła je do Firebase Storage i zapisuje manifest w bazie.

Zawartość tego katalogu jest wykluczona z gita (poza tym plikiem).
