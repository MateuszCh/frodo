# Etap 1 — audyt obecnego UI Frodo

Stan na: 19.10.2026, gałąź `claude/frodo-redesign-project-054547` (od `45c02c0`).

## 0. Zakres i metoda

- Audyt powstał wyłącznie na podstawie kodu: szablonów, stylów, routingu, serwisów i testów w `front/src`. Aplikacja nie była uruchamiana. Żaden serwer nie działał, w worktree nie ma `node_modules`, a `CLAUDE.md` zabrania uruchamiania serwerów.
- Zasada nadrzędna (doprecyzowana w trakcie): **wizualnie może zmienić się wszystko**, czyli układ, struktura szablonów, kolory, typografia i ikony. **Funkcjonalność zostaje bez zmian**: te same dane, akcje, stany, kolejność kroków i treści generowane przez logikę.
- Dlatego ograniczenia strukturalne (sekcja 6) mają dwie kategorie:
  - **twarde**: zależy od nich kod TypeScript, więc projekt musi je uszanować;
  - **miękkie**: selektory testów jednostkowych. Przy wdrożeniu można je zaktualizować razem z szablonem, ale każda taka zmiana kosztuje i trzeba ją policzyć.
- Język interfejsu jest angielski. Komunikaty przychodzą z serwera i z logiki TS po angielsku, więc makiety też będą po angielsku.

---

## 1. Mapa aplikacji

Aplikacja to panel CMS z jednym zalogowanym użytkownikiem naraz. Wszystkie trasy poza `/login` chroni `authGuard`. Dane ładują resolvery, więc **widok renderuje się dopiero po pobraniu danych**.

| Trasa | Komponent | Dane (resolver) | Rodzina (`data.family`) |
|---|---|---|---|
| `/`, `/pages` | `ListingComponent` | wszystkie strony | `pages` |
| `/pages/add`, `/pages/edit/:id` | `PageComponent` | komponenty (+ strona) | `pages` |
| `/posts/:type` | `ListingComponent` | typ wpisu z wpisami | `posts` |
| `/posts/:type/add`, `/posts/:type/edit/:id` | `PostComponent` | typ wpisu (+ wpis) | `posts` |
| `/post-types` | `ListingComponent` | wszystkie typy wpisów | `postTypes` |
| `/post-types/add`, `/post-types/edit/:id` | `PostTypeComponent` | (typ wpisu) | `postTypes` |
| `/components` | `ListingComponent` | wszystkie komponenty | `components` |
| `/components/add`, `/components/edit/:id` | `PostTypeComponent` (tryb komponentu) | (komponent) | `components` |
| `/files` | `FilesComponent` | wszystkie pliki | `files` |
| `/login` | `LoginComponent` | czy istnieje użytkownik | — |
| `/account` | `AccountComponent` | bieżący użytkownik | — |
| `**` | `ErrorComponent` | — | — |

Poza trasami istnieją jeszcze dwie nakładki: **dialog komunikatu** (alert lub potwierdzenie) i **dialog wyboru pliku** (biblioteka plików w trybie popup).

Liczba unikalnych układów ekranów: **8**. Są to: shell, listing, edytor wpisu, edytor schematu (typ wpisu / komponent), edytor strony, biblioteka plików, logowanie / konto i strona błędu.

---

## 2. Ekrany i widoki

Legenda stanów:
- **Ł**: ładowanie,
- **P**: pusty,
- **B**: błąd,
- **W**: walidacja,
- **S**: sukces,
- **Z**: zajęty (akcja w toku).

Stan „zajęty” wygląda w całej aplikacji tak samo: klasa `.busy` ustawia `opacity: .6` i `pointer-events: none`. Nie ma spinnera ani atrybutu `disabled`.

### 2.1 Shell (ramka aplikacji)

Pliki: `app.html`, `layout/sidenav/*`, `layout/header/*`.

- **Nawigacja boczna** (`mat-sidenav`, 342 px). Na ekranach ≥ 960 px jest stała (`mode="side"`). Poniżej 960 px wysuwa się nad treść (`mode="over"`) i zamyka się po każdej nawigacji.
  - Logo: napis „Frodo” krojem Pacifico, 48 px, link do `/`.
  - Stałe pozycje: Pages, Components, Post Types, Files.
  - Dynamiczne pozycje: po jednej dla każdego typu wpisu (`pluralTitle`, np. „Articles”). Lista odświeża się po każdym zapisie lub usunięciu typu.
  - Nazwa zalogowanego użytkownika jako link do `/account`, z odstępem 32 px nad nim.
  - „Logout”: element `<a>` bez `href` z obsługą `(click)`.
  - Stany:
    - aktywna pozycja: tekst 21 px, pogrubiony, `#ff5722`; zmiana rozmiaru jest animowana;
    - hover: tło `rgba(0,0,0,.08)`;
    - focus-visible: warstwa stanu 12%;
    - wylogowywanie: `.busy`. Przy błędzie jest tylko `console.error`, użytkownik nic nie widzi.
- **Nagłówek mobilny** (tylko poniżej 960 px i poza `/login`): pomarańczowy pasek 56 px, wyśrodkowane logo „Frodo” (Pacifico, 32 px, białe) i przycisk menu po prawej.
- **Przycisk „Back to Top”** (`mat-fab`, prawy dolny róg): pojawia się, gdy `#scroll` jest przewinięty. W praktyce `#scroll` ma `overflow: hidden`, a przewijają się wewnętrzne kontenery, więc **przycisk nigdy się nie pokazuje**. Mimo to jest w kolejności tabulacji (ma tylko `opacity: 0`).
- **`/login`**: brak nawigacji, nagłówka i przycisku FAB.

### 2.2 Logowanie (`/login`)

- Elementy: logo „Frodo” (Pacifico, 48 px), pola Username i Password (oba wymagane), przycisk „Sign in”, pod nim linia na komunikat błędu (zarezerwowana wysokość, czerwony tekst).
- Szerokość formularza: `max-width: 25%` szerokości okna na desktopie i 80% poniżej 960 px. Przy 960 px to 240 px, przy 2560 px aż 640 px.
- Stany:
  - **P**: gdy w bazie nie ma żadnego użytkownika, zamiast formularza pojawia się tekst „There is no username, please contact admin”;
  - **W**: pod pustymi polami „This is required”;
  - **Z**: „Sign in” z `.busy`;
  - **B**: komunikat z serwera pod przyciskiem („Incorrect username”, „Incorrect password”, domyślnie „Login failed”);
  - **S**: przekierowanie na `/`.

### 2.3 Listing (wspólny dla czterech rodzin)

Pliki: `features/listing/*`. Jeden komponent obsługuje strony, komponenty, typy wpisów i wpisy danego typu.

- **Nagłówek** (sticky, tło `#fafafa`, dolna linia):
  - tytuł wyśrodkowany krojem Unica One, 48 px. Tytuł pochodzi z logiki i ma postać `pages`, `components`, `post types` (małymi literami) albo `pluralTitle` typu;
  - licznik `(n)` w 24 px, pokazujący liczbę pozycji po filtrowaniu.
- **Akcje.** Wszystkie to pomarańczowe przyciski `raised` o identycznej wadze wizualnej:
  - Add;
  - Edit (tylko wpisy; otwiera edycję typu wpisu);
  - Import (otwiera ukryty `input type=file` z akceptacją `.json`);
  - Export i Sort (tylko gdy lista nie jest pusta). Sort to przycisk z samą ikoną, `aria-label="Sort by"`, otwierający `mat-menu` z pozycjami newest, oldest, title oraz po jednej dla każdego pola sortowalnego typu wpisu; aktywna pozycja ma tło i pogrubienie;
  - Filters (tylko wpisy i tylko poniżej 960 px).

  Na mobile akcje układają się w siatkę 3 kolumn na pełną szerokość.
- **Lista**: `mat-list` z kartami. Każda karta ma 56 px wysokości i cień `0 2px 5px rgba(0,0,0,.26)`. Zawiera tytuł (link do edycji, ale klikalny jest tylko tekst) i czerwony przycisk „Delete”. Lista doładowuje się przy przewijaniu: najpierw 20 pozycji, potem po 10, gdy przewinięto ponad 80%.
- **Panel filtrów**:
  - na desktopie stała prawa kolumna, 30% szerokości;
  - na mobile szuflada z prawej strony z ciemnym tłem pod spodem; szerokość wynika z treści, bo nie ma jej ustawionej.

  Zawartość:
  - nagłówek „filters” (Unica One);
  - pole Search;
  - dla wpisów dodatkowo, zależnie od pól typu:
    - pole typu checkbox: grupa radio True / False / All;
    - select, multiselect i katalog: wielokrotny `mat-select`;
    - liczba: zakres Minimum–Maximum;
    - data: zakres From–To z kalendarzem;
  - przycisk „Reset Filters” (tylko wpisy).

  Dla pozostałych rodzin panel zawiera tylko Search.
- Stany:
  - **Ł**: brak. Resolver blokuje nawigację, poprzedni ekran zostaje widoczny do czasu pobrania danych. Doładowanie listy jest natychmiastowe (dane są już w pamięci).
  - **P**: „There are no {title} yet”, a w panelu „There are no {title} to filter”.
  - **P (filtr)**: „There are no {title} matching your selection”.
  - **Z**:
    - Import i Export z `.busy`;
    - przy usuwaniu najpierw dialog potwierdzenia, potem Delete z `.busy`;
    - po sukcesie wiersz zamienia się na 2 s w komunikat serwera, zielony (`.col-ok`, np. „Page removed successfully”), a potem znika.
  - **B**: dialog alertu z komunikatem serwera, np. „Error removing”, „Wrong file format!”, „There is no correct posts to import”, „There was an error exporting”.
  - **S**: import kończy się alertem „3 articles were successfully imported”; eksport pobiera plik.

### 2.4 Edytor wpisu (`/posts/:type/add|edit/:id`)

Pliki: `features/posts/*`, `features/fields/*`.

- **Nagłówek** (sticky): „Add new Article” lub „Edit Article” (tytuł z logiki, Unica One 48 px, wyśrodkowany). Akcje: Save (submit, pomarańczowy) i Delete (czerwony, tylko przy edycji).
- **Treść** (kolumna o szerokości maks. 720 px):
  - pole Title (wymagane);
  - nagłówek „Fields” (Unica One 32 px, wyśrodkowany);
  - pola dynamiczne zdefiniowane w typie wpisu.

  Każde pole dynamiczne leży w białym pudełku `.field` z ciężkim cieniem wewnętrznym (`inset 0 0 8px darkgray`). Typy pól (komponent `app-field`):

  | Typ | Wygląd i zachowanie |
  |---|---|
  | text | pole tekstowe |
  | textarea | pole wielowierszowe, 3 wiersze |
  | number | pole liczbowe |
  | select | `mat-select` i czerwony przycisk „Clear” obok |
  | multiselect | wielokrotny `mat-select` i „Clear” |
  | catalogue | `mat-select` z listą katalogów plików i „Clear” |
  | checkbox | `mat-checkbox` z etykietą „{Title} : true/false” (wartość jest częścią etykiety) |
  | date | pole z kalendarzem i „Clear” |
  | repeater | tytuł, pod nim wiersze z obramowaniem. Każdy wiersz zawiera swoje pola i czerwony przycisk „Delete row”. Pod wierszami pomarańczowy „Add new row”. **Rekurencja**: pola wewnątrz wiersza mogą być kolejnymi repeaterami. |
  | file | tytuł, przyciski „Select file” (otwiera dialog wyboru pliku) i „Clear” (tylko gdy plik jest wybrany), podgląd obrazu maks. 200 px |

- Stany:
  - **P**: „There are no fields yet”, gdy typ nie ma pól.
  - **W**: tylko Title jest wymagany i pokazuje „This is required”. Przy nieudanym zapisie wszystkie pola zostają oznaczone, a widok przewija się do pierwszego błędu.
  - **Z**: Save lub Delete z `.busy`.
  - **S**: przy edycji alert „{title} updated successfully”; przy dodawaniu przekierowanie na adres nowego wpisu; przy usunięciu powrót do listingu.
  - **B**: alert z komunikatem serwera („Error saving”, „There was an error removing {title}”).

### 2.5 Edytor schematu: typ wpisu lub komponent

Ścieżki: `/post-types/add|edit/:id` i `/components/add|edit/:id`. Pliki: `features/post-types/*`.

- **Nagłówek**: „Add new post type”, „Add new component”, „Edit {type} post type” albo „Edit {type} component”. Akcje: Save i Delete (tylko przy edycji).
- **Pola**:
  - Title (wymagane);
  - Plural Title (wymagane, tylko typ wpisu);
  - Type (wymagane, przy wpisywaniu automatycznie zamienia się na `snake_case` małymi literami).
- **Sekcja „Fields”** to lista kart `app-add-field`. Każda karta ma po lewej czerwony przycisk Delete, a po prawej treść:
  - Title (wymagane);
  - Id (wymagane, automatycznie `snake_case`);
  - Select type (wymagane): Text, Textarea, True/False, Select, Multiselect, Repeater, Number, File, Date, Catalogue;
  - dla Select i Multiselect pole „Options (separated by semicolons)” (wymagane);
  - dla Repeatera zagnieżdżone karty `app-add-field` (dowolna głębokość, wcięcie 8 px) i przycisk „Add new repeater field” wyrównany do prawej.

  Na końcu listy przycisk „Add new field”.
- Stany:
  - **P**: „There are no fields yet”.
  - **W**: „This is required” pod każdym wymaganym polem, przewinięcie do pierwszego błędu. Walidację serwerową pokazuje alert, np. „Duplicate field ids”, „Duplicate types”, „Each field should have a different id”.
  - **Z**: Save lub Delete z `.busy`.
  - **S**: przy edycji alert „{type} updated successfully”; przy dodawaniu przejście do edycji nowego schematu; przy usunięciu powrót do listingu. Menu boczne odświeża się w każdym z tych przypadków.
  - **B**: alert.

### 2.6 Edytor strony (`/pages/add|edit/:id`)

Pliki: `features/pages/*`.

- **Nagłówek**: „Add new page” lub „Edit {title} page”, akcje Save i Delete.
- **Pola**: Title (wymagane), Url (wymagane), SEO Title, SEO Description (pole wielowierszowe, 2 wiersze).
- **Sekcja „Components”** to lista sortowana przeciąganiem (`cdkDropList`). Każdy wiersz składa się z:
  - uchwytu przeciągania nad kartą (ikona dwóch poziomych kresek, wyśrodkowana, kursor `move`);
  - karty `app-add-component`, a w niej:
    - przycisk zwijania z ikoną strzałki obracaną o 180°, widoczny dopiero po wybraniu typu, z mało opisowym `aria-label="toggle"`;
    - `mat-select` „Type” z listą komponentów;
    - czerwony przycisk Delete;
    - po rozwinięciu pola wybranego komponentu (ten sam `app-field` co w edytorze wpisu, więc z repeaterami i plikami).

  Na końcu listy przycisk „Add new component”.
- Przeciąganie: podgląd przeciąganego elementu z cieniem, miejsce docelowe z `opacity: .4`, animacja przesunięcia 200 ms. Obsługa tylko myszą lub dotykiem.
- Stany:
  - **P**: „There are no components yet”.
  - **W**: Title i Url wymagane.
  - **Z**: Save lub Delete z `.busy`.
  - **S**: przy edycji alert „{title} page updated successfully”; przy dodawaniu przekierowanie.
  - **B**: alert, np. „Duplicate urls” albo „There already is page with "…" url”.

### 2.7 Biblioteka plików (`/files`)

Pliki: `features/files/files/*`.

- **Nagłówek**: „Files (n)” krojem Unica One oraz przyciski Import i Export (Export tylko gdy są pliki).
- **Zakładki** (`mat-tab-group`): „SELECT FILE” i „ADD NEW FILES”. Wielkie litery są wpisane w szablon.
- **Zakładka „SELECT FILE”**:
  - lewa kolumna, 70% szerokości:
    - filtry: Search oraz „Select catalogue” (wielokrotny wybór, tylko gdy istnieją katalogi);
    - siatka miniatur: **10 kolumn** na desktopie i 4 poniżej 960 px. Każda miniatura to kwadratowy przycisk z obrazem lub zastępczą grafiką PDF. Obraz po załadowaniu animuje skalę od 0 do 1 przez 0,5 s. Zaznaczona miniatura ma pomarańczową ramkę wewnętrzną 5 px;
    - doładowanie przy przewijaniu: najpierw 120, potem po 40;
  - prawa kolumna, 30% szerokości, widoczna **tylko po zaznaczeniu pliku**:
    - nazwa pliku (Unica One 32 px);
    - przyciski Save i Delete, a w trybie popup także Choose;
    - lista metadanych: Date, URL, Type, Size;
    - podgląd;
    - formularz: Title, Description, Author, Place, Position, Select catalogue, „Add new catalogue” z przyciskiem Add;
  - bez zaznaczenia prawe 30% jest puste;
  - na mobile prawa kolumna przechodzi pod siatkę.
- **Zakładka „ADD NEW FILES”**:
  - na starcie tylko wyśrodkowany przycisk „Select files” (ukryty input, wiele plików, JPG/PNG/GIF/PDF);
  - po wybraniu plików układ trzech kolumn (30% / 35% / reszta):
    - akcje: Select files, Upload, Delete files i pasek postępu wysyłania;
    - lista nazw plików oczekujących; zaznaczony plik ma pomarańczowe tło i biały tekst;
    - panel zaznaczonego pliku: nazwa, „Size: …”, Delete, podgląd i ten sam formularz metadanych co wyżej;
  - **zakładka nie ma żadnych stylów mobilnych**, więc trzy kolumny ściskają się na wąskim ekranie.
- Stany:
  - **P**: „There are no files yet”. Pusty panel szczegółów nie ma komunikatu.
  - **Ł**: przy wysyłaniu pasek postępu w procentach. Przy wejściu na trasę brak stanu ładowania (resolver).
  - **Z**: Save, Delete, Upload, Import i Export z `.busy`.
  - **S**: alerty „{filename} saved successfully”, „{filename} removed successfully”, „Files uploaded successfully” (po wysłaniu automatyczny powrót na pierwszą zakładkę) oraz „3 files were successfully imported”.
  - **B**: alerty „Error uploading”, „There was error uploading files”, „Wrong file format!” i inne.

### 2.8 Dialog wyboru pliku (popup)

Plik: `features/files/file-picker-dialog/*`. Otwiera go pole typu `file` w edytorach.

- To `MatDialog` o wymiarach 90vw × 85vh (maks. 95vw) z `panelClass: 'file-picker-panel'`. W środku działa ten sam `FilesComponent` w trybie popup:
  - nie ma nagłówka „Files” ani przycisków Import i Export;
  - w prawym górnym rogu jest ikonowy przycisk zamknięcia;
  - w panelu szczegółów pojawia się dodatkowy przycisk Choose, który zamyka dialog i zwraca plik.
- Stany:
  - **Ł**: pliki pobiera sam komponent, bez wskaźnika. **Do czasu odpowiedzi widać fałszywy pusty stan** „There are no files yet”.
  - Pozostałe stany jak w bibliotece.

### 2.9 Konto (`/account`)

- Formularz wyśrodkowany w pionie i poziomie na 100vh, szerokość 320 px (maks. 80vw). Nie ma nagłówka strony w stylu reszty aplikacji.
- Elementy:
  - nagłówek `h3` „Change Password” (Unica One 40 px);
  - pola Password, New password, New password confirmation (wszystkie wymagane);
  - przycisk „Change password”;
  - linia na komunikat.
- Stany:
  - **W**: „This is required”.
  - **Z**: przycisk z `.busy`.
  - **B**: czerwony komunikat z serwera („Wrong password”, „Passwords do not match”, „Error changing password”).
  - **S**: zielony komunikat „Password changed successfully”.

### 2.10 Strona błędu (`**`)

- Sam `<h2>Something went wrong</h2>` bez stylów i bez linku powrotnego. W praktyce to strona 404 dla nieznanych adresów. Błędy API nie trafiają tutaj.

### 2.11 Dialog komunikatu (alert i potwierdzenie)

Pliki: `core/dialogs/message-dialog/*`, `core/tools.service.ts`.

- **Alert**: treść i przycisk „Ok” (flat, primary).
- **Potwierdzenie**: treść oraz przyciski „No” (tekstowy) i „Yes” (flat, primary). Potwierdzenie pojawia się **wyłącznie przy usuwaniu**, zawsze z treścią „Are you sure you want to delete {x}?”.
- Obsługa tytułu istnieje w kodzie, ale żadne wywołanie go nie przekazuje.
- Alert to jedyny kanał informacji o sukcesie i błędzie w edytorach i bibliotece plików. Łącznie 31 wywołań, wszystkie modalne i wymagające kliknięcia „Ok”.

---

## 3. Komponenty wielokrotnego użytku

| Komponent | Gdzie | Warianty | Stany obecne w kodzie |
|---|---|---|---|
| **Przycisk** | wszędzie | `mat-raised-button` primary (pomarańczowy) i warn (czerwony); `mat-flat-button` primary (dialog); `mat-button` tekstowy („No”); `mat-icon-button` (menu, zamknij, zwiń, kalendarz); `mat-fab` (do góry); przycisk z samą ikoną w stylu raised (Sort) | default; hover i focus jako warstwa stanu Material; **busy** (`.busy`); **brak wariantu disabled w użyciu**; wszystkie etykiety WIELKIMI LITERAMI |
| **Pole tekstowe** (`mat-form-field`, appearance fill przerobiony na samo podkreślenie) | formularze, filtry | text, password, number, textarea, z ikoną kalendarza, z gwiazdką wymagalności, `subscriptSizing="dynamic"` (filtry plików) | default (szara etykieta i linia); focus (pomarańczowa etykieta i linia); invalid (czerwona etykieta i `mat-error` „This is required”); wypełnione (etykieta nad polem) |
| **Select** (`mat-select`) | pola dynamiczne, filtry, typ pola, katalog | pojedynczy, wielokrotny | default, otwarty panel, wybrana opcja, invalid (typ pola) |
| **Checkbox** | pole True/False | etykieta z wartością | zaznaczony, niezaznaczony |
| **Grupa radio** | filtr True/False/All | 3 opcje w wierszu | wybrana opcja |
| **Kalendarz** | pole date, filtry dat | pojedyncza data, zakres jako dwa pola | otwarty i zamknięty |
| **Kontener pola** `.field` | edytory | białe pudełko z cieniem wewnętrznym; wewnątrz repeatera bez ramki | — |
| **Wiersz pola z „Clear”** | select, multiselect, catalogue, date | pole i czerwony przycisk | — |
| **Pole pliku** | edytory | bez pliku: Select file; z plikiem: Select file, Clear i podgląd | — |
| **Repeater** | edytory | wiersze z obramowaniem i „Delete row”, przycisk „Add new row”, zagnieżdżanie | pusty (sam przycisk), z wierszami |
| **Karta definicji pola** (`app-add-field`) | edytor schematu | podstawowa; z opcjami (select, multiselect); repeater z kartami zagnieżdżonymi | invalid |
| **Karta komponentu strony** (`app-add-component`) | edytor strony | bez typu (tylko select); z typem zwinięta lub rozwinięta | przeciągana (podgląd), miejsce docelowe |
| **Uchwyt przeciągania** | edytor strony | — | default, kursor `move` |
| **Nagłówek ekranu** (tytuł, licznik, akcje; sticky) | listing, edytory, pliki (3 kopie tego samego CSS) | z licznikiem (listing, pliki), bez licznika (edytory) | — |
| **Element listy** (`.listing-item`) | listing | tytuł z linkiem i Delete | default, usuwanie (busy), usunięty (komunikat przez 2 s) |
| **Menu sortowania** (`mat-menu`) | listing | lista opcji | aktywna opcja |
| **Panel filtrów** | listing | stała kolumna (desktop), szuflada z tłem (mobile) | otwarty, zamknięty, pusty |
| **Grupa filtra** (`.filter-box`) | panel filtrów | radio, zakres liczb, zakres dat | — |
| **Zakładki** (`mat-tab-group`) | pliki | 2 zakładki | aktywna |
| **Siatka miniatur** | pliki | obraz, zastępcza grafika PDF | ładowanie obrazu (animacja skali), zaznaczona |
| **Panel szczegółów pliku** | pliki | plik zapisany (metadane, Save, Delete, opcjonalnie Choose), plik oczekujący (rozmiar, Delete) | — |
| **Lista metadanych** | pliki | etykieta i wartość, URL łamany | — |
| **Lista plików oczekujących** | pliki | — | zaznaczony |
| **Pasek postępu** | wysyłanie plików | determinate | — |
| **Dialog** (`MatDialog`) | globalnie | alert, potwierdzenie, duży dialog z biblioteką plików | — |
| **Nawigacja boczna** | shell | pozycja stała, pozycja typu wpisu, użytkownik, wylogowanie | aktywna, hover, focus-visible, busy |
| **Nagłówek mobilny** | shell, poniżej 960 px | — | — |
| **Komunikat formularza** (`.form-message`) | logowanie, konto | błąd (czerwony), sukces (zielony), pusty z zarezerwowaną wysokością | — |
| **Pusty stan** | listing, edytory, pliki | wyśrodkowany akapit | — |
| **Logo** | sidenav, nagłówek mobilny, logowanie | Pacifico 48 px (ciemne), 32 px (białe na pomarańczowym) | — |

---

## 4. Obecny język wizualny

### 4.1 Kolory

| Wartość | Użycie | Uwagi |
|---|---|---|
| `#ff9800` / `rgb(255,152,0)` | nagłówek mobilny, przyciski primary, focus pól, zaznaczona miniatura, zaznaczony plik do wysłania, pasek przewijania, `theme-color` w `index.html` i manifeście, tło favikony | dwa zapisy tej samej wartości; wpisany na sztywno z `!important` |
| `#ff5722` | aktywna pozycja menu | **drugi pomarańczowy**, niespójny z `#ff9800` |
| `#f44336` / `rgb(244,67,54)` | przyciski warn (Delete, Clear, Delete row), tekst błędów | w jednym miejscu użyty token `--mat-sys-error`, gdzie indziej hex |
| `#4caf50` | komunikat sukcesu (konto, usunięcie z listy) | zdefiniowany lokalnie dwa razy |
| `#52443C` | litera „F” w favikonie | jedyny ciemny kolor marki |
| `rgb(250,250,250)` | tło aplikacji, sticky nagłówki, panel filtrów | zapisany 6 razy |
| `#fff` | sidenav, karty pól, karty komponentów, miniatury | — |
| `rgba(0,0,0,.12)` | wszystkie linie i obramowania | w trzech miejscach jako `box-shadow inset` zamiast `border` |
| `rgba(0,0,0,.54)`, `rgba(0,0,0,.6)` | etykiety pól, metadane, rozmiar pliku | — |
| `rgba(0,0,0,.08)` | hover w menu, aktywna opcja sortowania | — |
| `darkgray` | cień wewnętrzny `.field` | kolor nazwany |
| `#ebebeb` | tor paska przewijania | — |
| Paleta Material 3 z `mat.$orange-palette` i `mat.$red-palette` | domyślne tokeny `--mat-sys-*` (np. tła dialogów, menu, checkboxy, radio) | **równolegle** z ręcznie wpisanymi hexami z M2, więc komponenty Material bez nadpisań mają inny odcień pomarańczu |
| `$colors-map` w `_utilities.scss` (`#0f1830`, `#007089`, `#29001e`, `#9b1d20`, `#93aa3e`…) | generuje klasy `.col-*` i `.bg-col-*` | w szablonach użyte tylko `bg-col-1` i `col-w`, reszta to martwy kod |

### 4.2 Typografia

- **Trzy kroje z Google Fonts CDN**, bez hostowania lokalnego:
  - Oswald: tekst bazowy, przyciski, pola i typografia Material;
  - Unica One: tytuły ekranów i sekcji;
  - Pacifico: logo.
- Ładowany jest także font **Material Icons, który nie jest nigdzie używany**, bo wszystkie ikony to pliki SVG.
- Rozmiary liczone w `em` względem rodzica (`fs-N = N/2 em`), więc łatwo je pomnożyć przez przypadek:

  | Element | Rozmiar |
  |---|---|
  | tytuł ekranu (`fs-6`) | 48 px |
  | tytuł konta (`fs-5`) | 40 px |
  | podtytuły sekcji, nazwa pliku, logo w nagłówku (`fs-4`) | 32 px |
  | licznik (`fs-1` w kontekście 48 px) | 24 px |
  | aktywna pozycja menu | 21 px |
  | etykiety pól | 16 px (Material) |
  | pozycje menu, przyciski, lista plików | 14 px |
  | metadane | 13 px |

- `text-transform: uppercase` dla wszystkich przycisków, pozycji `mat-menu` i nawigacji. Etykiety zakładek są wielkimi literami wpisanymi na sztywno.
- Niespójności i problemy:
  - Oswald jest wąskim krojem nagłówkowym, a służy też do tekstu w polach i przyciskach;
  - tytuły po 48 px są wyśrodkowane w sticky nagłówku i na mobile zajmują dużo wysokości;
  - nie ma skali typograficznej ani wysokości linii zdefiniowanej poza Material.

### 4.3 Odstępy

- Wartości w stylach: 4, **5** (wiersz metadanych), 8, **12** (padding nagłówków i list), 16, 24, 32 px. Odstęp między polami to `margin-bottom: 8px` plus wysokość podpisu Material.
- Większość mieści się w siatce 4 lub 8 px, ale nie ma skali ani tokenów. Te same odstępy są wpisywane ręcznie w każdym pliku SCSS.
- Gęstość jest wysoka: nagłówek ekranu ma tylko 12 px paddingu, karty listy są przyklejone do siebie z odstępem 8 px, a w panelu filtrów `.filter-box` ma 8 px paddingu.

### 4.4 Promienie

| Element | Promień |
|---|---|
| przyciski (nadpisanie z pigułki M3) | 4 px |
| pozycje nawigacji | 4 px |
| panel dialogu wyboru pliku | 4 px |
| dialog alertu | domyślnie M3, ok. 28 px |
| karty listy, pola, komponentów, definicji pól, miniatury | 0 px |

Wynik jest **niespójny**: prostokątne karty sąsiadują z mocno zaokrąglonym dialogiem.

### 4.5 Cienie

| Element | Cień |
|---|---|
| karta listy | `0 2px 5px rgba(0,0,0,.26)` (styl Material 1) |
| `.field` | `inset 0 0 8px .5px darkgray` (ciężki, „wklęsły”) |
| karty definicji pola i komponentu, grupa filtra | `inset 0 0 0 1px rgba(0,0,0,.12)` (obramowanie udawane cieniem) |
| sidenav | `4px 0 8px rgba(0,0,0,.1)` |
| szuflada filtrów | `-4px 0 8px rgba(0,0,0,.15)` |
| podgląd przeciągania | dwie warstwy w stylu M2 |
| przyciski | cień `raised` M3 |
| zaznaczona miniatura | `inset 0 0 0 5px #ff9800` |

Sześć różnych języków cienia i brak skali elewacji.

### 4.6 Breakpointy

- **W TypeScript** (`LayoutService`): 600, 960, 1280 i 1921 px. Serwis ustawia na `<body>` klasy `size-s|m|l|x|xl`, ale **żaden styl ich nie używa**.
- **W CSS**: tylko `max-width: 959px` i `min-width: 960px`.
- Podejście jest **desktop-first**: style bazowe są desktopowe, a mobile to nadpisania.
- Granica 960 px jest wpisana w logikę TS i decyduje o:
  - trybie nawigacji (stała albo wysuwana);
  - widoczności nagłówka mobilnego;
  - tle pod szufladą filtrów.

### 4.7 Ruch

| Element | Animacja |
|---|---|
| `#page` | `fade-in` 0,25 s |
| pozycja menu | rozmiar fontu 0,2 s |
| FAB | 0,2 s |
| szuflada filtrów | 0,25 s z `cubic-bezier(.25,.8,.25,1)` |
| miniatury | skala 0 → 1 w 0,5 s |
| przeciąganie | 200 ms |
| strzałka akordeonu | obrót bez przejścia |

Brak obsługi `prefers-reduced-motion`.

### 4.8 Ikony i warstwy

- 9 plików SVG zarejestrowanych w `MatIconRegistry`:
  - `menu`, `arrow`, `arrow-black`, `arrow-down`, `sort`, `hand-white`, `hand-black`, `close`, `closeB`;
  - 8 z nich ma **wpisany na sztywno kolor** (`#fff` lub `#000`), więc nie dziedziczy koloru z CSS;
  - tylko `arrow-down` używa `currentColor`;
  - osobne pliki „białe” i „czarne” to ten sam kształt.
- Warstwy `z-index`:
  - 10: sticky nagłówki, zamknięcie popupu;
  - 1000: tło szuflady;
  - 1001: szuflada;
  - kontener nakładek CDK ma 1000.

### 4.9 Inne

- Paski przewijania wymuszone na stałe (`-webkit-appearance: none`) z pomarańczowym suwakiem na szarym torze.
- Pozostałości po AngularJS: atrybuty `layout` i `layout-align` w nagłówku, utilities z `front-legacy`.
- Nieużywane importy: `MatTooltipModule` i `MatSliderModule`.
- Nadpisania tokenów `--mdc-*-button-container-height` prawdopodobnie nie działają w Angular Material 22, bo to stare nazwy tokenów MDC.
- `angular.json` ma budżet stylów komponentu: **ostrzeżenie przy 4 kB, błąd przy 8 kB**. To istotne przy wdrożeniu, bo style trzeba będzie trzymać w tokenach i stylach globalnych, a nie rozbudowywać per komponent.

---

## 5. Theming

- **Jeden motyw jasny, jedna marka.** Nie ma wielu motywów, tenantów ani przełącznika.
- Mechanizm:
  1. `mat.theme()` (Material 3) w `styles.scss` na `html`: primary to paleta orange, tertiary to red, typografia Oswald, density 0, `color-scheme: light`;
  2. ręczne nadpisania kolorów klas Material z `!important` (wartości z M2);
  3. utilities SCSS (`.col-*`, `.bg-col-*`, `.font-*`, `.fs-*`).
- Brak własnych tokenów semantycznych. Kolory są wpisane bezpośrednio w ok. 15 plikach SCSS.
- **Wniosek dla etapu 3.** Struktura tokenów musi obsłużyć tylko jeden motyw. Musi jednak:
  - mieć warstwy *prymitywy → tokeny semantyczne* (`--color-surface`, `--color-text-muted`…), żeby tryb ciemny dało się później dodać jako drugi zestaw wartości semantycznych, np. pod `[data-theme="dark"]`;
  - **mapować tokeny semantyczne na tokeny systemowe Material** (`--mat-sys-primary`, `--mat-sys-surface`, `--mat-sys-on-surface`…) oraz w razie potrzeby na tokeny komponentów (przez miksiny `mat.*-overrides`). Komponenty Material zostają, bo od nich zależy logika (sekcja 6.1), więc muszą czytać kolory z naszych tokenów, a nie z wpisanych na sztywno `!important`.

---

## 6. Ograniczenia strukturalne

### 6.1 Twarde: zależy od nich logika TS

| # | Element | Gdzie w kodzie | Co to oznacza dla projektu |
|---|---|---|---|
| T1 | `id="scroll"` na `mat-sidenav-content` | `ToolsService.scrollToError('#scroll')`, `App.onScroll()` | Formularze muszą leżeć wewnątrz `#scroll`. Id zostaje. Przycisk „Back to Top” reaguje tylko na przewijanie tego elementu (patrz U8). |
| T2 | Granica 960 px i `mat-sidenav` z trybem side/over | `App.isDesktop`, `ListingComponent.isDesktop`, `LayoutService` | Główny breakpoint układu musi wynosić **960 px**. Poniżej nawigacja jest wysuwana i ma nagłówek z przyciskiem menu, powyżej jest stała. Inne breakpointy (600, 1280) można dodać w samym CSS, bo klasy `size-*` są dostępne na `<body>`. |
| T3 | `mat-tab-group #tabs` w bibliotece plików | `viewChild.required<MatTabGroup>('tabs')`, `selectedIndex = 0` po wysłaniu | Podział na „wybór” i „dodawanie” musi zostać komponentem `MatTabGroup`. Wygląd zakładek jest dowolny, np. przełącznik segmentowy. |
| T4 | Dialogi przez `MatDialog` | `ToolsService.alert/confirm`, `FieldInputComponent.openFiles` | Sukcesy, błędy i potwierdzenia zostają **modalami**. Wymiary dialogu wyboru pliku (90vw × 85vh) są wpisane w TS, a styl idzie przez `panelClass: 'file-picker-panel'`. Inny rozmiar wymaga nadpisania CSS albo zmiany konfiguracji w TS (do decyzji). |
| T5 | `appInfiniteScroll` | listing (`.listing-list`), pliki (`.files-grid-pane`) | Element z dyrektywą musi leżeć wewnątrz elementu, który faktycznie się przewija (dowolnego przodka albo dokumentu). Wolno zmienić, *który* kontener przewija, ale dyrektywa musi zostać w środku. |
| T6 | `appImgLoaded` dodaje klasę `img-loaded` | miniatury plików | Host musi zawierać `<img>`. Klasa `img-loaded` to jedyny hak do stanu „obraz załadowany”. |
| T7 | Nazwy kontrolek `ngModel` (`name`) i prefiksy | `namePrefix` w repeaterze, `comp_{i}_` w komponentach strony, `uid` w definicjach pól | Nie zmieniać. Od nich zależy walidacja i rozdzielenie wierszy. |
| T8 | Rekurencja | `app-field` ↔ `app-repeater`, `app-add-field` | Projekt musi obsłużyć **zagnieżdżanie bez limitu głębokości**: wcięcia i obramowania, które nie zjadają szerokości na mobile. |
| T9 | Struktura `cdkDropList` > `cdkDrag` > `cdkDragHandle` | edytor strony | Uchwyt musi leżeć wewnątrz przeciąganego elementu. Klasy `.cdk-drag-preview`, `.cdk-drag-placeholder` i `.cdk-drop-list-dragging` to haki stylów. |
| T10 | Stan „usunięty” wiersza listy | `lastRemoved`, `removeStatus` w listingu | Wiersz na 2 s zamienia się w komunikat z serwera. Projekt potrzebuje tego stanu. |
| T11 | Ukryte `input type=file` wywoływane przyciskami | Import (listing, pliki), Select files | Projektujemy wyłącznie przyciski. Natywne pole zostaje ukryte. |
| T12 | Warunki widoczności w szablonach powiązane z danymi | Edit i Filters tylko dla wpisów; Export i Sort tylko przy niepustej liście; Clear pliku tylko z plikiem; Choose tylko w popupie; Plural Title tylko dla typu wpisu; przycisk zwijania tylko po wybraniu typu komponentu | Makiety muszą pokazywać te warianty, a nie jeden uśredniony stan. |
| T13 | Panel filtrów zawsze widoczny na desktopie, szuflada `filtersOpen` na mobile | listing | Na desktopie filtry muszą być stale widoczne, bo nie ma przełącznika poza mobile. |
| T14 | Treści generowane przez logikę | tytuły („Edit Article”, „Add new post type”, `pages`), komunikaty alertów, błędy serwera, liczniki, etykieta checkboxa „{Title} : true” | Tekst bez zmian. Wielkość liter można zmienić w CSS (`text-transform`). Tytuły `pages` i `post types` mogą się wyświetlać jako „Pages”. |
| T15 | Automatyczne formatowanie pól Type i Id | edytor schematu | Pole zmienia wpisany tekst w trakcie pisania. Warto to zasygnalizować podpowiedzią przy polu, ale treść podpowiedzi to nowy tekst (do decyzji). |

### 6.2 Miękkie: selektory testów jednostkowych (Vitest)

Testy szukają elementów po klasach, atrybutach i **dokładnym tekście przycisków** (`textContent.trim() === 'Add'`). Zmiana szablonu w tych miejscach wymaga aktualizacji testów, które nie są logiką.

| Plik testu | Na czym polega |
|---|---|
| `listing-template.spec.ts` | `.listing-list`, `.listing-list[appInfiniteScroll]`, `.filters-backdrop`, `.listing-item__row.center` i jego `p`, klasy `col-ok` i `busy`, `button[color="warn"]` (pierwszy taki przycisk to Delete w wierszu), teksty przycisków „Add”, „Edit”, „Filters”, „Reset Filters”, „Export”, „Import”, `aria-label="Sort by"`, `button[mat-menu-item]`, `mat-radio-group`, `mat-select`, `mat-datepicker`, `input[type="number"]`, `input[type="file"]` |
| `files.spec.ts` | `.files-grid__item` i jego `img`, `.files-edit__name`, `.files-edit__preview img`, `.files-edit__meta li`, `.upload-list-item`, `.files-upload__edit` (**pierwszy przycisk w nim to Delete**), `.files-actions`, `.files-popup-close`, `.files-grid-pane`, `.files-select`, `mat-progress-bar`, `input[multiple]`, `input[accept=…]`; **kolejność `ngModel`** w panelach: Title, Description, Author, Place, Position, katalogi, nowy katalog; teksty „Add”, „Choose”, „Delete”, „Delete files”, „Export”, „Import”, „Save”, „Select files”, „Upload” |
| `field-input.spec.ts` | `.field-file__preview` i jego `img`, `mat-select`, `mat-option`, `mat-checkbox`, `mat-datepicker-toggle`, `textarea`, `input[type=…]`; teksty „Select file”, „Clear”; lista przycisków pola pliku równa dokładnie `['Select file', 'Clear']` |
| `repeater.spec.ts` | `.repeater-row input`; teksty „Add new row”, „Delete row” |
| `listing-filters.spec.ts` | `mat-form-field:first-of-type input` (**pierwsze pole to Search**), `mat-option`, kolejność `mat-select` (select, multiselect, catalogue) |
| `login.spec.ts` | `input[name="username"]`, `input[name="password"]`, `button[type="submit"]` |
| `message-dialog.spec.ts` | `mat-dialog-content`, `[mat-dialog-title]`, `mat-dialog-actions button` z tekstami „Ok”, „Yes”, „No” |
| `img-loaded.directive.spec.ts` | klasa `img-loaded` |
| `layout.service.spec.ts`, `tools.service.spec.ts` | klasy `size-*`, `#scroll` |

Wnioski dla projektu:

- **Etykiety przycisków zostają słowo w słowo.** Ikony w przyciskach muszą być SVG (`svgIcon`) albo pseudo-elementami CSS. Ligatura fontu ikon (`<mat-icon>add</mat-icon>`) dopisuje tekst do `textContent` i psuje testy.
- **Kolejność pól w panelach plików i filtrów zostaje.** Układ można zmienić w CSS (grid), kolejność w DOM nie.
- Nazwy klas z tabeli warto zachować, nawet jeśli zmieni się ich wygląd. To najtańsza ścieżka wdrożenia.

### 6.3 Tracking

W kodzie nie ma analityki, atrybutów `data-*` ani `data-testid`. Jedyne `id` to `scroll` i `page` w `app.html`.

---

## 7. Problemy UX/UI i dostępności

### 7.1 Hierarchia i układ

1. **Brak akcji głównej.** Na listingu Add, Edit, Import, Export, Sort i Filters to identyczne pomarańczowe przyciski. Na mobile tworzą siatkę 3 × 2, czyli dwa pełne rzędy przycisków nad listą.
2. **Czerwień dominuje.** Delete jest przy każdym wierszu listy, Clear przy każdym select i dacie, Delete row w każdym wierszu repeatera, Delete przy każdej karcie. Kolor błędu działa jak ozdoba, a nie sygnał.
3. **Nagłówki ekranów zjadają przestrzeń.** Mają 48 px, są wyśrodkowane i sticky. Na telefonie nagłówek mobilny, tytuł i siatka akcji zajmują ok. 30% wysokości ekranu (ok. 240 z 812 px).
4. **Wiersz listy jest ubogi i mało klikalny.** Tylko tekst tytułu jest linkiem, a całą kartę wizualnie dominuje przycisk Delete.
5. **Formularze edytorów są ciężkie.** Każde pole ma pudełko z wklęsłym cieniem. Nagłówki sekcji („Fields”, „Components”) są wyśrodkowane w kroju dekoracyjnym. Grupy (dane podstawowe, SEO, pola, komponenty) nie są od siebie wyraźnie oddzielone.
6. **Karta definicji pola ma Delete po lewej**, przed treścią, w osobnej kolumnie. Na mobile ta kolumna zabiera szerokość. Przy zagnieżdżeniu wcięcie wynosi tylko 8 px, więc trudno odczytać, które pole należy do którego repeatera.
7. **Biblioteka plików:**
   - 10 kolumn miniatur na desktopie daje małe kafle;
   - bez zaznaczenia prawe 30% ekranu jest puste;
   - nazwa pliku w kroju dekoracyjnym 32 px;
   - zakładka wysyłania nie ma układu mobilnego;
   - etykiety zakładek pisane są wielkimi literami.
8. **Logowanie:** formularz o szerokości 25% okna (za wąski na małym desktopie, za szeroki na dużym), bez karty i bez kontekstu.
9. **Konto i błąd 404** nie wyglądają jak reszta aplikacji. Konto nie ma nagłówka ekranu, a 404 nie ma żadnych stylów.
10. **Nawigacja:**
    - aktywna pozycja zmienia rozmiar z 14 na 21 px, co przesuwa układ;
    - używa innego pomarańczu niż reszta;
    - stałe sekcje i dynamiczne typy wpisów nie są wizualnie rozdzielone;
    - wylogowanie wygląda jak zwykła pozycja menu.
11. **Typografia:** trzy kroje, wąski Oswald w polach formularzy i wszechobecne WIELKIE LITERY obniżają czytelność.

### 7.2 Stany

12. **Brak stanu ładowania przy nawigacji.** Resolvery trzymają poprzedni ekran bez żadnego sygnału, że coś się dzieje. Do zaprojektowania nie ma tu nic, bo dodanie wskaźnika wymaga logiki (zob. lista „poza zakresem”).
13. **Stan zajęty jest słabo widoczny i niedostępny:** samo `opacity: .6`, bez spinnera, bez `disabled` i `aria-busy`. Klawiatura nadal może aktywować przycisk.
14. **Fałszywy pusty stan w dialogu wyboru pliku.** Podczas ładowania widać „There are no files yet”.
15. **Na mobile wyszukiwanie w listingu stron, komponentów i typów jest niedostępne.** Szuflada otwiera się tylko przyciskiem Filters, a ten istnieje tylko dla wpisów.
16. **Sukces zawsze jest modalem.** Każdy zapis wymaga kliknięcia „Ok”. Zmiana na toast to nowa interakcja (poza zakresem). W ramach zakresu da się tylko odróżnić wizualnie alert sukcesu od alertu błędu, ale dialog nie zna typu komunikatu, więc również to wymaga decyzji.

### 7.3 Dostępność

Kontrast (WCAG 2.1, wyliczony):

| Para | Kontrast | Gdzie | Wynik |
|---|---|---|---|
| biały na `#ff9800` | **2,16 : 1** | wszystkie przyciski primary, nagłówek mobilny (logo 32 px), zaznaczony plik | ✗ (AA wymaga 4,5, a dla dużego tekstu 3,0) |
| biały na `#f44336` | **3,68 : 1** | przyciski warn (14 px) | ✗ |
| `#f44336` na `#fafafa` | **3,53 : 1** | komunikaty błędów (logowanie, konto), etykiety pól z błędem | ✗ |
| `#4caf50` na białym | **2,78 : 1** | komunikaty sukcesu | ✗ |
| `#ff9800` na `#fafafa` | **2,06 : 1** | etykieta i linia pola w focusie | ✗ dla tekstu, ✗ dla elementu UI (3,0) |
| `#ff5722` na białym | 3,16 : 1 | aktywna pozycja menu (21 px, 600) | ✓ tylko jako duży tekst |
| `rgba(0,0,0,.54)` na `#fafafa` | 4,54 : 1 | etykiety pól | ✓ na granicy |
| `rgba(0,0,0,.12)` na białym | 1,32 : 1 | jedyne obramowanie kart i pól | ✗ jako granica komponentu (3,0) |
| `#52443C` na `#ff9800` | 4,33 : 1 | favikona | element graficzny, nie dotyczy |

Inne problemy:

17. **Focus:** Material pokazuje go tylko jako 12-procentową warstwę stanu, bez obrysu. W nawigacji focus jest wyłączony poza `:focus-visible`. Nie ma żadnego wspólnego stylu focusu.
18. **Elementy niewidoczne, ale fokusowalne:**
    - FAB „Back to Top” (`opacity: 0`);
    - zamknięta szuflada filtrów na mobile (przesunięta poza ekran, a jej pola nadal są w kolejności tabulacji).
19. **„Logout” to `<a>` bez `href`**, więc nie trafia do kolejności tabulacji i ma rolę linku zamiast przycisku.
20. **Etykiety ARIA:**
    - przycisk zwijania komponentu ma `aria-label="toggle"` bez `aria-expanded`;
    - podgląd pliku w polu ma `alt="selected file"`.
21. **Przeciąganie komponentów działa tylko myszą lub dotykiem.** CDK nie obsługuje klawiatury, a alternatywa (np. przyciski góra/dół) to nowa funkcja.
22. Pola logowania i konta nie mają `autocomplete` (`username`, `current-password`, `new-password`). Dodanie samych atrybutów w szablonie nie zmienia logiki.
23. Hierarchia nagłówków: `h1` „Frodo” w nawigacji (i drugi `h1` w nagłówku mobilnym), `h2` na ekranach, a na koncie `h3` bez `h2`.
24. Brak `prefers-reduced-motion`, mimo animacji skali miniatur i przesuwania szuflady.
25. Na mobile przewijają się wewnętrzne kontenery zamiast strony, więc przeglądarki mobilne nie chowają paska adresu. Nadmiarowe, zawsze widoczne paski przewijania w kolorze akcentu zwiększają szum.

### 7.4 Dług wizualno-techniczny, który redesign powinien posprzątać

- Trzy fonty z CDN plus nieużywany font ikon: zastąpić jednym krojem hostowanym lokalnie.
- Mieszanka Material 2 i 3 z nadpisaniami `!important`: zastąpić mapowaniem tokenów.
- Trzy kopie stylów nagłówka i treści edytora: zastąpić jednym globalnym wzorcem.
- Ikony SVG z wpisanym kolorem: przejść na `currentColor` (zmiana plików w `assets`, nie logiki).
- Martwe utilities, atrybuty AngularJS i nieużywane importy.
- Budżet stylów komponentu (4 / 8 kB) wymusza, żeby nowy wygląd opierał się na tokenach i stylach globalnych.

---

## 8. Propozycja kluczowych widoków do makiet (etap 4)

| # | Widok | Dlaczego |
|---|---|---|
| 1 | **Shell i listing wpisów danego typu** (`/posts/:type`), np. „Articles” | Najbogatszy wariant jedynego listingu. Ma wszystkie akcje (Add, Edit, Import, Export, Sort, Filters), wszystkie typy filtrów, menu sortowania, szufladę mobilną i stany: pusty, brak wyników, usuwanie i usunięty. Jednocześnie projektuje nawigację, nagłówek mobilny i nagłówek ekranu. Listingi stron, komponentów i typów to jego podzbiory. |
| 2 | **Edytor wpisu** (`/posts/:type/edit/:id`) | Pokazuje wszystkie 10 typów pól (z repeaterem i polem pliku) oraz walidację i stany zapisu. Te same komponenty pól są używane w edytorze strony. |
| 3 | **Edytor strony** (`/pages/edit/:id`) | Najbardziej złożona interakcja: lista komponentów z przeciąganiem i zwijaniem, zagnieżdżone pola, sekcja SEO. Sprawdza, czy system kart i wcięć działa. |
| 4 | **Edytor typu wpisu** (`/post-types/edit/:id`) | Kreator schematu z rekurencyjnymi kartami definicji pól i walidacją. Obejmuje też edytor komponentu (ten sam widok). |
| 5 | **Biblioteka plików** (`/files`) z zakładką wysyłania | Jedyny widok siatkowy z panelem szczegółów i wysyłaniem z postępem. Najsłabszy obecnie na mobile. Ten sam komponent tworzy dialog wyboru pliku, który da się pokazać jako wariant makiety. |
| 6 | **Logowanie** (z kontem jako wariantem) | Pierwsze wrażenie i miejsce na logo. Prosty formularz pozwala dopracować stany pól i komunikaty. Konto korzysta z tych samych elementów. |

Dialogi (alert i potwierdzenie), stronę 404 i pozostałe listingi pokażę w arkuszu komponentów (etap 3), bez osobnych makiet.

---

## 9. Pytania przed etapem 2

1. **Logo.** Brief mówi, że logo zostaje, a późniejsza wiadomość, że wizualnie może zmienić się wszystko. Proponuję zostawić znak bez zmian: napis „Frodo” w Pacifico i favikonę (pomarańczowy kwadrat z brązowym „F”). Pacifico jest na licencji OFL, więc da się go hostować lokalnie i używać wyłącznie w logo. Paletę dobiorę tak, żeby z nim współgrała. Czy tak zostawiamy?
2. **Przyciski destrukcyjne a zasada „kolory statusów tylko do komunikatów”.** Proponuję, żeby Delete i Clear w listach i formularzach były neutralne (tekstowe lub obrysowe). Kolor błędu zostałby tylko dla przycisku „Yes” w dialogu potwierdzenia, który zawsze dotyczy usuwania. Czy to akceptowalne?
3. **Testy.** Czy przy wdrożeniu wolno aktualizować selektory w plikach `*.spec.ts`, jeśli zmieni się struktura szablonu? Testy nie są logiką, ale to zmiana poza stylami i szablonami. Jeśli nie, makiety zachowają klasy, teksty i kolejność z sekcji 6.2.
4. **Teksty statyczne w szablonach.** Proponuję zostawić je słowo w słowo, np. „There are no pages yet”, „SELECT FILE”, „Edit”, i zmieniać tylko wielkość liter w CSS. Ewentualne poprawki tekstów trafią na listę „poza zakresem / wymaga decyzji”.

### Decyzje (19.10.2026)

| # | Pytanie | Decyzja | Skutek dla projektu |
|---|---|---|---|
| 1 | Logo | **Może się zmienić.** | Każdy kierunek w etapie 2 proponuje własny znak i logotyp. Pacifico nie jest już wymagany. |
| 2 | Przyciski destrukcyjne | **Według rekomendacji.** | Delete, Clear i Delete row są neutralne (przyciski tekstowe lub obrysowe z ikoną kosza albo krzyżyka). Kolor błędu ma tylko przycisk potwierdzenia w dialogu usuwania. |
| 3 | Testy | **Wolno je aktualizować.** | Selektory z sekcji 6.2 przestają być ograniczeniem projektu. Przy wdrożeniu specyfikacje trzeba zaktualizować razem z szablonami. Nadal obowiązuje: ikony w przyciskach jako SVG, żeby nie zmieniać nazw dostępnych przycisków. |
| 4 | Teksty | **Mogą się zmienić.** | Etykiety, tytuły i komunikaty w szablonach można przeredagować, np. „Add” → „New article”, „Edit” → „Edit type”. Treści pochodzące z serwera zostają bez zmian. Dodane etykiety (np. nagłówki grup w nawigacji) przestają być pozycją „poza zakresem”. |

**Decyzja z 20.10.2026 (po etapie 4):** dodajemy motyw ciemny i przełącznik **Light / Dark**, bez opcji „System”. Przy pierwszym wejściu obowiązuje motyw z ustawień systemu. Przełącznik wymaga małego serwisu motywu (zapis wyboru, atrybut `data-theme`). To świadomy wyjątek od zasady „tylko style i szablony”. Szczegóły: `03-design-system.md`, punkty 2.10 i 5.33.

Treść przykładowa w makietach pochodzi ze strony publicznej (geosilesia), która czyta tę samą bazę:
- typy wpisów: `marker` (punkty na mapie: lat, long, link, place, categories), `wydarzenie` (date_and_place, date_of_publication, paragraphs, links), `icon`, `navigation`;
- komponenty stron: homepage_banner, map, title_and_text, gallery, gallery_list, tabs, news, literature, dictionary, footnotes, heading, geosites_logos, marker_category_list.

Interfejs CMS zostaje po angielsku, a treść jest po polsku.

## 10. Wstępna lista „poza zakresem / wymaga decyzji”

Zbiorcza lista pojawi się w etapie 5. Na razie zebrałem:

- Wskaźnik ładowania przy nawigacji między ekranami (wymaga obsługi zdarzeń routera).
- Powiadomienia typu toast zamiast modalnego alertu przy sukcesie; rozróżnienie alertu sukcesu i błędu.
- Przycisk Filters lub Search dla listingów innych niż wpisy na mobile (dziś wyszukiwanie jest tam niedostępne).
- Daty utworzenia i modyfikacji w wierszach listy (dane są w odpowiedzi API, ale dziś się ich nie pokazuje).
- Cofnięcie usunięcia (nazwa `lastRemoved` sugeruje „undo”, ale takiej akcji nie ma).
- Alternatywa klawiaturowa dla przeciągania komponentów (przyciski góra/dół).
- ~~Nagłówki grup w nawigacji, np. „Content” i „Structure”~~: rozstrzygnięte decyzją 4, nowe etykiety są dozwolone.
- Stan ładowania i pusty stan „Select a file” w panelu szczegółów biblioteki plików.
- Link powrotny i treść strony 404.
- Podpowiedź przy polach Type i Id, że tekst jest automatycznie formatowany.
- Wymiary dialogu wyboru pliku zapisane w TS.
- Tryb ciemny: tokeny będą na niego gotowe, ale samego trybu nie projektujemy.
