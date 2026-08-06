# Zdjęcia po obróbce

Ten katalog może służyć jako lokalne źródło zdjęć po obróbce. Same zdjęcia są ignorowane przez Git.

Nazwa pliku powinna odpowiadać nazwie zdjęcia w aplikacji. Rozszerzenie może być inne, jeśli rdzeń nazwy pozostaje jednoznaczny.

Przed przygotowaniem zawsze uruchom kontrolę:

```powershell
npm run photos:edited:check
```

Można też wskazać katalog poza repozytorium:

```powershell
npm run photos:edited:check -- --source "D:\Photos\DominDev-Frame"
```
