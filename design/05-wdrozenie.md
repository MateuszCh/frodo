# Etap 5: notatki wdrożeniowe

Stan na: 20.10.2026. Projekt: kierunek C „Sage” z motywem jasnym i ciemnym (`tokens.css`, `components.css`, `icons.js`, `03-komponenty.html`, `widoki/`). Ścieżki plików aplikacji podaję względem `front/src/`.

Legenda w tabelach:
- **S**: zmiana w stylach;
- **T**: zmiana w szablonie (`.html`) lub w `index.html`;
- **L**: zmiana w logice (TypeScript). Wszędzie „bez zmian”, z jednym wyjątkiem opisanym w punkcie 4.

---

## 1. Podsumowanie

- Cały redesign da się wdrożyć zmianami w stylach i szablonach. Kontrolery, serwisy, resolvery, routing i serwer zostają bez zmian.
- **Jedyny wyjątek** to przełącznik motywu Light/Dark (decyzja z 20.10.2026): mały serwis motywu, dwie linie w `sidenav.ts` i krótki skrypt w `index.html` (punkt 4).
- **Największa zmiana strukturalna** dotyczy przewijania. Dziś przewijają się wewnętrzne kontenery widoków (`.listing-list`, `.editor-body`, panele plików), a `mat-sidenav-content#scroll` ma `overflow: hidden`. W nowym projekcie przewija się `#scroll`, a nagłówki są przyklejone. To zmiana CSS, ale dotyka zachowania przewijania w całej aplikacji (punkt 6, ryzyko R1).
- **Testy jednostkowe** trzeba zaktualizować razem z szablonami, zgodnie z decyzją z audytu. Lista jest w punkcie 7.

---

## 2. Architektura stylów

### 2.1 Nowe pliki (warstwa globalna)

| Plik | Zawartość | Źródło |
|---|---|---|
| `styles/_tokens.scss` | tokeny (warstwy 1–3, motyw ciemny) | `design/tokens.css` bez zmian |
| `styles/_fonts.scss` | `@font-face` IBM Plex Sans 400/500/600/700, latin i latin-ext, `font-display: swap`, `unicode-range` | nowe |
| `styles/_material.scss` | `mat.theme()` (typografia), mapowanie `--mat-sys-*` na tokeny, miksiny `mat.*-overrides()` | punkt 2.3 |
| `styles/components/_*.scss` | partiale z `design/components.css`, jeden na sekcję (przycisk, pole, menu, lista, nawigacja…) | `design/components.css` |
| `assets/fonts/*.woff2` + `OFL.txt` | 8 plików fontu i licencja | pobranie z repozytorium IBM Plex (OFL) |
| `assets/icons.svg` | sprite z symbolami z `design/icons.js` (bez skryptu) | `design/icons.js` |

`styles.scss` importuje partiale w kolejności: tokeny → fonty → Material → komponenty. Wpis `styles` w `angular.json` się nie zmienia.

### 2.2 Co znika

- `styles/_utilities.scss` (`.font-*`, `.fs-*`, `.col-*`, `.bg-col-*`, `.fw-*`, `.left`, `.right`, `.center`, `.block`) i wszystkie użycia tych klas w szablonach.
- Ze `styles.scss`:
  - nadpisania z `!important` (kolory przycisków, pól, etykiet);
  - globalny `.field` (białe pudełko z wewnętrznym cieniem) i `.repeater-title`;
  - globalne paski przewijania w kolorze pomarańczowym;
  - `.mat-drawer-content { overflow: hidden !important; display: flex … }`.
- Z `index.html`: linki Google Fonts (Oswald, Pacifico, Unica One) i nieużywany font Material Icons.
- Pliki `assets/images/*.svg` (9 ikon). `pdf-placeholder.png` zastępuje kafel z ikoną `file`.
- Lokalne pomocnicze klasy w komponentach (`.full-width`, `.center`, `.busy`, `.col-ok`).

### 2.3 Angular Material

1. `mat.theme()` dostaje typografię `'IBM Plex Sans'` i gęstość 0. Paleta kolorów Material nie ma znaczenia, bo nadpisujemy tokeny systemowe.
2. Mapowanie tokenów (na `html`, działa w obu motywach, bo wskazuje na zmienne):
   - `--mat-sys-primary` → `--color-accent`, `--mat-sys-on-primary` → `--color-text-on-accent`;
   - `--mat-sys-primary-container` / `--mat-sys-on-primary-container` → `--color-accent-subtle` / `--color-accent-subtle-text`;
   - `--mat-sys-surface`, `-container`, `-container-high`… → `--color-surface-overlay` (menu, select, kalendarz, dialog) albo `--color-surface`;
   - `--mat-sys-on-surface` → `--color-text`, `--mat-sys-on-surface-variant` → `--color-text-muted`;
   - `--mat-sys-outline` → `--color-border-strong`, `--mat-sys-outline-variant` → `--color-border`;
   - `--mat-sys-error` → `--color-error`, `--mat-sys-background` → `--color-bg`.
3. Kształty, wysokości i stany przez miksiny `mat.button-overrides`, `mat.form-field-overrides`, `mat.select-overrides`, `mat.menu-overrides`, `mat.dialog-overrides`, `mat.tabs-overrides`, `mat.checkbox-overrides`, `mat.radio-overrides`, `mat.datepicker-overrides`, `mat.progress-bar-overrides`, `mat.sidenav-overrides`, `mat.list-overrides`. Wartości zawsze przez `var(--…)`, nigdy wpisane na sztywno, bo inaczej nie zadziała motyw ciemny.
4. Klas wewnętrznych MDC (`.mdc-*`, `.mat-mdc-*`) używamy tylko tam, gdzie nie ma tokenu. Każde takie miejsce oznaczamy komentarzem, bo nazwy zmieniają się między wersjami.

### 2.4 Ikony

Rekomendacja: sprite `assets/icons.svg` i w szablonach `<svg class="icon" aria-hidden="true"><use href="icons.svg#i-plus"/></svg>`. To zmiana wyłącznie w szablonach. `registerAppIcons()` w `core/icons.ts` przestaje być potrzebne, ale może zostać do czasu sprzątania kodu.

Alternatywa: pliki SVG w `assets/icons/` rejestrowane w `core/icons.ts`. Wymaga dopisania nazw w mapie w TS (konfiguracja, nie logika).

---

## 3. Widoki i komponenty

### 3.1 Szkielet: `app.html`, `app.scss`, `styles.scss`

| | Zmiana |
|---|---|
| S | `mat-sidenav-content#scroll` przewija treść (usunąć `overflow: hidden` i flex z `.mat-drawer-content`). Szerokość nawigacji 264 px zamiast 342 px. `#page` od 960 px jako biały blat (promień 20 px, odstęp 12 px od okna). Przycisk „do góry” w stylu `.fab`: widoczność przez istniejącą klasę `.scrolled`, a ukryty ma `visibility: hidden`. Usunąć animację `.fade`. |
| T | `#page` dostaje klasę blatu, a `[class.page--login]` zostaje (logowanie bez blatu). Przycisk „do góry” z ikoną `arrow-up` i `aria-label="Back to top"`. W `index.html`: `viewport-fit=cover`, dwie wersje `<meta name="theme-color">` z `media` (#F3F4F1 i #1F2522), favikony i `site.webmanifest` (`theme_color` #0F766E, `background_color` #F3F4F1). |
| L | bez zmian. `onScroll()` zaczyna działać, bo `#scroll` naprawdę się przewija. |
| Ryzyka | R1 (przewijanie), R7 (bezpieczne obszary telefonu). |

### 3.2 Pasek górny (mobile): `layout/header/*`

| | Zmiana |
|---|---|
| S | Tło `--color-bg`, wysokość 56 px, przyklejony. Koniec pomarańczowego paska z białym logo. |
| T | Przycisk menu po lewej (`aria-label="Open menu"`), logo (znak i logotyp) obok. Usunąć `h1` z logo (jedyny `h1` to tytuł ekranu) oraz atrybuty `layout` i `layout-align` z AngularJS. |
| L | bez zmian |

### 3.3 Nawigacja: `layout/sidenav/*`

| | Zmiana |
|---|---|
| S | `.nav`, `.nav__item`, `.sidebar__footer`, `.user`, `.avatar`, `.theme-switch`. Aktywna pozycja zmienia tło i wagę, a nie rozmiar. |
| T | Grupy Content / Media / Structure. Pozycje stałe zapisane bezpośrednio w szablonie (`routerLink` + porównanie `route().family`), bo kolejność z tablicy `navigation` w TS nie pasuje do grup. Typy wpisów dalej z `postTypes()`. Każda pozycja ma ikonę i `[attr.aria-current]`. Konto: awatar z pierwszą literą `userService.user().username`. „Log out” to `<button type="button" (click)="logout()">` z `[attr.aria-busy]="logoutStatus()"` i spinnerem. Przełącznik motywu nad kontem (punkt 4). |
| L | bez zmian, poza wstrzyknięciem serwisu motywu (punkt 4). Tablica `navigation` przestaje być używana: zostaje do sprzątania kodu (lista decyzji, pozycja D10). |

### 3.4 Lista: `features/listing/listing/*`, `listing-filters/*`

| | Zmiana |
|---|---|
| S | `.page-header`, `.list-card`, `.list-toolbar`, `.list__row` (cały wiersz klikalny), `.filters` (arkusz poniżej 960 px, panel od 960 px). Usunąć wewnętrzne przewijanie `.listing-list` i `.listing-drawer`. Tytuł z logiki (`pages`, `post types`) zaczyna się wielką literą przez `::first-letter`. |
| T | Nagłówek: tytuł, licznik (`matchCount()`), akcja główna „New {typ}” (`$any(model()).title \| lowercase` dla wpisów; dla pozostałych rodzin stały tekst w `@switch (family())`), akcje tekstowe Edit type, Import, Export. Pasek listy: wyszukiwarka przeniesiona z `app-listing-filters` (to samo `filters()?.textFilter.value` + `onFilterChange()`), przycisk sortowania z nazwą bieżącego sortowania (pętla po `sortTypes()`) i etykieta „Fields” przed czwartą opcją, „Filters” tylko dla wpisów. Wiersz: link na całą szerokość i przycisk kosza z `aria-label="Delete {{ model.title }}"` oraz spinnerem w stanie `removeStatus().busy`. Stan „usunięto” bez zmian w logice, tylko nowe klasy. Panel filtrów tylko dla wpisów (`@if (isPosts())`). Na mobile `[class.is-open]="filtersOpen()"` oraz przycisk zamknięcia `(click)="filtersOpen.set(false)"`. Puste stany: „No {title} yet” i „No {title} match your search”. W `listing-filters` znika pole Search, a filtr True/False/All dostaje wygląd przełącznika. |
| L | bez zmian. Dyrektywa `appInfiniteScroll` zostaje na liście i znajduje `#scroll` jako przewijanego przodka. |
| Ryzyka | R1, R2 (testy), R6 (CDK: menu sortowania). |

### 3.5 Edytor wpisu: `features/posts/*`

| | Zmiana |
|---|---|
| S | `.editor-bar` (mobile: akcje w dolnym pasku, od 960 px w pasku u góry), `.page--form`, karty sekcji. |
| T | Nad tytułem „Edit {typ}” / „New {typ}”. Tytuł na żywo `model().title \|\| 'Untitled'`. Delete jako przycisk tekstowy z ikoną. Save główny z `[attr.aria-busy]` i spinnerem w stanie `actionStatus() === 'save'`. Karty: Title, Fields. Pusty stan „No fields yet”. |
| L | bez zmian (`save()`, `removeDialog()`, `scrollToError()`). |

### 3.6 Pola dynamiczne: `features/fields/field-input/*`, `repeater/*`

| | Zmiana |
|---|---|
| S | `.field`, `.input`, `.control--select`, `.field-row`, `.file-field`, `.repeater` (wiersze z numerem z licznika CSS, naprzemienne tło zagnieżdżeń). |
| T | **Etykieta nad polem** (rekomendacja): `mat-form-field` zostaje (`appearance="outline"`, bez `mat-label`). Etykieta przechodzi do `<label class="field__label" [for]="ctrl">` nad polem, a pole dostaje `[id]="ctrl"`, które jest unikalne dzięki `namePrefix`. `mat-error` zostaje i jest stylowane jak `.field__error`. „Clear” jako przycisk tekstowy z ikoną `x`. Checkbox bez dopisku „: wartość”. Pole pliku: pusty stan „No file selected”, podgląd i przyciski. Repeater: „Delete row” i „Add row” jako małe przyciski. Nazwy kontrolek (`name`) bez zmian. |
| L | bez zmian (`clear()`, `openFiles()`, `addRow()`, `removeRow()`). |
| Ryzyka | R3 (`mat-form-field` z etykietą na zewnątrz), R2. |

### 3.7 Edytor typu wpisu i komponentu: `features/post-types/*`

| | Zmiana |
|---|---|
| S | `.schema-field` (karta), `.schema-field__children` (wcięcie z linią). |
| T | Karty: Basic information (Title, Plural Title tylko dla typu, Type z podpowiedzią o formatowaniu) i Fields. Nagłówek karty pola: `field.title \|\| 'Untitled field'`, znacznik `field.type`, kosz z `aria-label`. Title i Id w siatce dwóch kolumn od 600 px, Id krojem o stałej szerokości. Podpowiedź pod Options. „Add field” i „Add field to row”. |
| L | bez zmian (`formatType()`, `formatId()`, rekurencja `app-add-field`, `uid`). |

### 3.8 Edytor strony: `features/pages/*`

| | Zmiana |
|---|---|
| S | `.blocks`, `.block-card` (uchwyt na całej wysokości, numer z licznika CSS, obrót strzałki), klasy CDK `.cdk-drag-preview`, `.cdk-drag-placeholder`, `.cdk-drop-list-dragging` w warstwie globalnej. |
| T | Karty: Basic information (Title, Url z podpowiedzią), Search engines (SEO), Components (z licznikiem). Wiersz: `cdkDrag` na `li`, `cdkDragHandle` na pierwszej kolumnie, numer, przycisk zwijania z `[attr.aria-expanded]="open()"` i etykietą „Show/Hide fields of {title}”, select komponentu z podpowiedzią „Choose a component”, kosz. „Add component”. |
| L | bez zmian (`drop()`, `addComponent()`, `onSelect()`). Struktura `cdkDropList` › `cdkDrag` › `cdkDragHandle` zostaje. |
| Ryzyka | R5 (podgląd przeciągania renderowany w `body`). |

### 3.9 Biblioteka plików i dialog wyboru: `features/files/*`

| | Zmiana |
|---|---|
| S | Zakładki (`mat-tab-group` przez `mat.tabs-overrides`), `.library__toolbar`, `.thumbs` (3 / 4 / auto kolumny zamiast 10), `.thumb` (stan `img-loaded`, zaznaczenie `.current`), `.library--selected` (panel 360 px obok siatki od 1280 px), `.upload-empty`, `.pending`, `.upload-layout`, `.progress`. Usunąć wewnętrzne przewijanie paneli i animację skali miniatur. Na mobile dialog wyboru na cały ekran: reguła dla `.cdk-overlay-pane.file-picker-panel` z `!important`, bo wymiary są wpisane w TS (punkt 6, R4). |
| T | Nagłówek „Files” z licznikiem, Import i Export. Etykiety zakładek „Library” i „Upload”. Filtr katalogów z podpowiedzią „All catalogues”. Kontener siatki `[class.library--selected]="!!selected()"`. Panel szczegółów: w trybie popup kolejność akcji Choose (główny) → Save → Delete, poza popupem Save → Delete. Upload: pusty stan z opisem formatów, lista plików z miniaturą (`previewUrl`), „Upload {{ pending().length }} files”, „Clear list”, „Remove”, etykieta postępu z `progress()`. Dialog wyboru: nagłówek „Choose a file” z przyciskiem zamknięcia zamiast przycisku pozycjonowanego absolutnie. Kolejność `ngModel` w panelach bez zmian. |
| L | bez zmian (`tabs().selectedIndex = 0`, `upload()`, `selectPending()`, `deriveCatalogues()`). |
| Ryzyka | R2 (najwięcej selektorów w `files.spec.ts`), R4. |

### 3.10 Dialog komunikatu: `core/dialogs/message-dialog/*`

| | Zmiana |
|---|---|
| S | `.dialog` (`mat.dialog-overrides`): promień 20 px, `--color-surface-overlay`, `--shadow-lg`. Poniżej 600 px przyciski w kolumnie. |
| T | Tryb potwierdzenia: stały tytuł „Confirm deletion”, przyciski „Cancel” (drugorzędny) i „Delete” (czerwony). Tryb alertu: „OK”. Tytuł z `data.title` dalej obsługiwany. |
| L | bez zmian (`ToolsService.alert/confirm`). |

### 3.11 Logowanie, konto, błąd: `features/auth/*`, `features/error/*`

| | Zmiana |
|---|---|
| S | `.auth`, `.auth__card` (karta 400 px), `.message`, `.form-message-slot`; konto jako ekran w szkielecie (`.page`, karta 560 px); `.error-page`. |
| T | Logowanie: logo, „Sign in”, jedno zdanie opisu, pola z `autocomplete="username"` / `"current-password"`, przycisk na całą szerokość ze spinnerem, komunikat błędu z ikoną. Bez użytkownika komunikat informacyjny. Konto: nagłówek „Account”, karta „Change password”, etykiety „Current password”, „New password”, „Confirm new password” z `autocomplete="current-password"` / `"new-password"`. 404: „Page not found” i zdanie podpowiedzi. |
| L | bez zmian |

### 3.12 Komponenty wspólne: podsumowanie

| Komponent | S | T | L |
|---|---|---|---|
| Przycisk | warianty primary / secondary / ghost / danger / ikona / mały, stany, spinner | `mat-flat-button` / `mat-stroked-button` / `mat-button` / `mat-icon-button`; `[attr.aria-busy]` zamiast `[class.busy]` | bez zmian |
| Pole, select, data, checkbox, radio | `mat.*-overrides` + `.field__*` | etykieta nad polem (3.6) | bez zmian |
| Menu sortowania, panel select, kalendarz | `--color-surface-overlay`, `--shadow-md`, stan aktywny | — | bez zmian |
| Karta, znacznik, komunikat, pusty stan | nowe klasy | nowe opakowania i teksty | bez zmian |
| Zakładki | `mat.tabs-overrides`: podkreślenie i kolor akcentu | etykiety | bez zmian |
| Pasek postępu | `mat.progress-bar-overrides` | etykieta z procentem | bez zmian |
| Przełącznik motywu | `.theme-switch` | nowy element w nawigacji | **serwis motywu (punkt 4)** |

---

## 4. Wyjątek: przełącznik motywu

| Element | Zmiana |
|---|---|
| `core/theme.service.ts` (nowy, około 25 linii) | Sygnał `theme: 'light' \| 'dark'`. Wartość startowa to zapis z `localStorage` (klucz np. `frodo.theme`), a bez zapisu `matchMedia('(prefers-color-scheme: dark)')`. Metoda `set(theme)` zapisuje wybór i ustawia `document.documentElement.dataset.theme`. Dostęp do `localStorage` w `try/catch` (tryb prywatny). |
| `core/theme.service.spec.ts` (nowy) | wartość startowa z zapisu i z systemu, zapis po zmianie, brak błędu bez `localStorage` |
| `layout/sidenav/sidenav.ts` | `protected theme = inject(ThemeService);` |
| `layout/sidenav/sidenav.html` | dwie opcje radio z `[checked]="theme.theme() === 'light'"` i `(change)="theme.set('light')"` (analogicznie Dark) |
| `index.html` | krótki skrypt w `<head>` ustawiający `data-theme` z `localStorage` przed startem Angulara, żeby strona nie mignęła jasnym motywem |

Bez zapisanego wyboru atrybut `data-theme` można nie ustawiać. Wtedy blok `prefers-color-scheme` w `tokens.css` dobiera motyw z systemu, także gdy ktoś zmieni ustawienie systemu w trakcie pracy.

---

## 5. Zgodność z ograniczeniami twardymi z audytu

| # | Ograniczenie | Jak jest spełnione |
|---|---|---|
| T1 | `id="scroll"`, `scrollToError('#scroll')` | id zostaje; formularze są wewnątrz; `#scroll` naprawdę przewija |
| T2 | granica 960 px, `mat-sidenav` side/over | wszystkie układy przełączają się przy 960 px; nawigacja zostaje w `mat-sidenav` |
| T3 | `mat-tab-group #tabs` | zostaje, zmienia się tylko wygląd |
| T4 | dialogi przez `MatDialog`, wymiary w TS | zostają; mobile przez CSS nadpisujące panel (R4) |
| T5 | `appInfiniteScroll` wewnątrz przewijanego przodka | spełnione, przodkiem jest `#scroll` albo przewijany obszar dialogu |
| T6 | klasa `img-loaded` | hak do płynnego pojawienia się obrazu |
| T7 | nazwy kontrolek `ngModel` | bez zmian, a `id` pól wynika z nich |
| T8 | rekurencja pól | naprzemienne tła i wcięcia działają na dowolną głębokość |
| T9 | struktura CDK drag & drop | bez zmian |
| T10 | stan „usunięto” | ostylowany, logika bez zmian |
| T11 | ukryte `input type=file` | bez zmian, stylowane są tylko przyciski |
| T12 | warunki widoczności zależne od danych | zachowane we wszystkich makietach (Edit type, Export, Sort, Choose, Plural Title, zwijanie) |
| T13 | panel filtrów stały od 960 px | zachowane |
| T14 | treści z logiki i serwera | bez zmian; wielkość liter przez CSS |
| T15 | automatyczne formatowanie Type i Id | bez zmian, z podpowiedzią przy polu |

---

## 6. Ryzyka

| # | Ryzyko | Skutek | Co zrobić |
|---|---|---|---|
| R1 | Przeniesienie przewijania z wnętrza widoków na `#scroll` | Inne miejsca przyklejania nagłówków, inny moment doładowania listy, inna wysokość widoków na telefonie | Usunąć `overflow` i stałe wysokości z widoków. Sprawdzić doładowanie listy (80%) na długich listach. Przetestować przycisk „do góry” i `scrollToError()` w każdym edytorze. |
| R2 | Testy jednostkowe szukają klas, tekstów i kolejności przycisków | Czerwone testy po zmianie szablonów | Aktualizować testy razem z każdym widokiem (punkt 7). Tam, gdzie to możliwe, zostawić stare nazwy klas obok nowych. |
| R3 | `mat-form-field` z etykietą na zewnątrz | Stany fokusu i błędu muszą wyglądać jak w makietach; znika „pływająca” etykieta | Nadpisania przez `mat.form-field-overrides`. Pole bez `mat-label` nie ma wycięcia w obrysie. Sprawdzić select i kalendarz wewnątrz pola. Alternatywa: zwykłe pole z `matInput` i własnym komunikatem błędu (więcej zmian w szablonach). |
| R4 | Wymiary dialogu wyboru pliku w TS (90vw × 85vh) | Na telefonie dialog nie zajmie całego ekranu bez nadpisania | Reguła z `!important` dla `.cdk-overlay-pane.file-picker-panel` poniżej 600 px, bez zmiany TS. Czystsza alternatywa to zmiana konfiguracji w `field-input.ts` (lista decyzji, D12). |
| R5 | Podgląd przeciągania CDK trafia do `body` | Style komponentu mogą do niego nie dotrzeć | Style `.cdk-drag-*` w warstwie globalnej. |
| R6 | Panele CDK (menu, select, kalendarz) też trafiają do `body` | Muszą czytać kolory z `:root` | Spełnione, bo tokeny są na `:root`, a panele stylujemy przez `panelClass` i miksiny. |
| R7 | `viewport-fit=cover` i bezpieczne obszary | Dolny pasek akcji i arkusz filtrów mogą wejść pod pasek systemowy | Odstępy z `env(safe-area-inset-*)` są już w `components.css`. Sprawdzić na iOS. |
| R8 | Budżet stylów komponentu 4 / 8 kB | `files.scss` (5,8 kB) już dziś przekracza ostrzeżenie | Style w warstwie globalnej; pliki `*.scss` komponentów zostają puste albo minimalne. |
| R9 | Kolizja nazwy `.field` | Stary globalny `.field` nadpisze nowy komponent | Usunąć stary styl w tym samym kroku, w którym wchodzi nowy. |
| R10 | Font hostowany lokalnie | Brak polskich znaków, jeśli zabraknie podzbioru latin-ext | Dołączyć oba podzbiory i sprawdzić „Zażółć gęślą jaźń” w każdej wadze. |
| R11 | Sprite ikon pod `<base href="/">` | Względna ścieżka `icons.svg#…` musi trafić w katalog główny | Ścieżka względem `base`; sprawdzić na trasach zagnieżdżonych (`/posts/marker/edit/12`). |
| R12 | Motyw ciemny w komponentach Material | Wartości wpisane na sztywno w nadpisaniach zostaną jasne | W nadpisaniach wyłącznie `var(--…)`. Przejrzeć każdy ekran w obu motywach. |
| R13 | Mignięcie jasnego motywu przy starcie | Krótki błysk bieli przy zapisanym ciemnym motywie | Skrypt w `<head>` (punkt 4). |

---

## 7. Testy do aktualizacji

| Plik | Co się zmienia |
|---|---|
| `listing-template.spec.ts` | teksty „Add” → „New {typ}”, „Edit” → „Edit type”, „Reset Filters” → „Reset”, „There are no … yet” → „No … yet”; `button[color="warn"]` → przycisk po `aria-label`; `.listing-item__row.center p` i `col-ok` → `.list__row--removed`; wyszukiwarka przeniesiona do paska listy |
| `listing-filters.spec.ts` | pierwsze pole to już nie wyszukiwarka; kolejność pozostałych filtrów bez zmian |
| `files.spec.ts` | „Delete files” → „Clear list”, „Upload” → „Upload {n} files”, pierwszy przycisk panelu pliku do wysłania to „Remove”; klasy siatki i paneli według nowych nazw albo zostawione obok nowych; kolejność `ngModel` bez zmian |
| `field-input.spec.ts` | etykieta checkboxa bez wartości („true”); „Select file” i „Clear” bez zmian |
| `repeater.spec.ts` | „Add new row” → „Add row”; `.repeater-row` → `.repeater__row` |
| `message-dialog.spec.ts` | „Yes” / „No” → „Delete” / „Cancel”, „Ok” → „OK”; tryb potwierdzenia ma stały tytuł |
| `login.spec.ts` | bez zmian (nazwy pól i `button[type="submit"]` zostają) |
| `theme.service.spec.ts` | nowy (punkt 4) |

Po każdym kroku wdrożenia: `ng build` (budżety) i `ng test`.

---

## 8. Kolejność wdrożenia

1. **Fundament:** `_tokens.scss`, fonty lokalne, `_material.scss`, sprite ikon. Usunięcie starych nadpisań i `_utilities.scss` razem z klasami w szablonach. Aplikacja działa jak wcześniej, w nowych kolorach i kroju.
2. **Szkielet:** przewijanie na `#scroll`, nawigacja z grupami, pasek górny, blat, przycisk „do góry”.
3. **Lista** wraz z filtrami i dialogiem komunikatu.
4. **Pola dynamiczne i edytor wpisu** (etykieta nad polem, repeater, pole pliku).
5. **Edytor strony i edytor typu** (karty, przeciąganie, definicje pól).
6. **Biblioteka plików** i dialog wyboru.
7. **Logowanie, konto, 404**, favikony i manifest.
8. **Motyw ciemny:** serwis, przełącznik, skrypt startowy; przegląd wszystkich ekranów w obu motywach.
9. **Sprzątanie:** puste pliki `*.scss` komponentów, nieużywane importy (`MatTooltipModule`, `MatSliderModule`), stare pliki ikon.

Każdy krok to osobny commit z zielonym `ng build` i `ng test`. Do porównania z makietami: `design/widoki/index.html`.

---

## 9. Poza zakresem / wymaga decyzji

Zbiorcza lista pomysłów, które wykraczają poza „tylko style i szablony” albo wymagają decyzji produktowej.

| # | Temat | Dlaczego poza zakresem | Uwagi |
|---|---|---|---|
| D1 | Wskaźnik ładowania przy przechodzeniu między ekranami | Wymaga obsługi zdarzeń routera (logika) | Dziś resolvery trzymają poprzedni ekran bez sygnału. |
| D2 | Powiadomienia typu toast zamiast modalnego alertu przy sukcesie | Nowa interakcja i zmiana `ToolsService` | Każdy zapis wymaga dziś kliknięcia „OK”. |
| D3 | Rozróżnienie alertu sukcesu i błędu (ikona, kolor) | Dialog nie zna typu komunikatu; trzeba go przekazać z TS | — |
| D4 | Daty utworzenia i modyfikacji w wierszach listy | Nowy element interfejsu (dane już są w odpowiedzi API) | Ułatwiłoby szukanie ostatnio zmienionych wpisów. |
| D5 | Cofnięcie usunięcia | Nowa funkcja | — |
| D6 | Klawiaturowa alternatywa dla przeciągania (przyciski góra/dół) | Nowa interakcja | Dziś zmiana kolejności komponentów strony wymaga myszy lub dotyku. |
| D7 | Wysyłanie plików przez przeciągnięcie na obszar | Nowa funkcja | Opis w zakładce Upload świadomie o tym nie wspomina. |
| D8 | Stan ładowania w dialogu wyboru pliku | Wymaga flagi ładowania w `FilesComponent` | Dziś przez chwilę widać fałszywy „No files yet”. |
| D9 | Link powrotny w edytorach (np. do listy) i na stronie 404 | Nowy element nawigacji | Nawigacja boczna jest zawsze dostępna. |
| D10 | Usunięcie tablicy `navigation` z `sidenav.ts` | Sprzątanie TS po przejściu na grupy zapisane w szablonie | Bez wpływu na działanie. |
| D11 | Przełącznik motywu także na ekranie logowania | Nowy element | Logowanie korzysta z zapamiętanego wyboru albo z ustawień systemu. |
| D12 | Wymiary dialogu wyboru pliku w konfiguracji TS (pełny ekran na telefonie) | Zmiana konfiguracji w `field-input.ts` | Obecnie rozwiązane nadpisaniem CSS (R4). |
| D13 | Nazwy sortowania z TS małymi literami („newest”) | Zmiana tekstów w TS | W projekcie wielka litera przez CSS. |
| D14 | Brzmienie komunikatów z logiki i serwera (np. „There is no correct posts to import”, „There already is page with … url”) | Zmiana TS i backendu | Poprawki językowe do osobnej decyzji. |
| D15 | Panel szczegółów pliku na telefonie jako arkusz zamiast bloku pod siatką | Wymaga sposobu odznaczenia pliku (dziś go nie ma) | Obecnie panel stoi pod siatką, jak dziś. |
| D16 | Format daty w polach i kalendarzu niezależny od języka przeglądarki | Konfiguracja adaptera dat (TS) | Dziś zależy od lokalizacji przeglądarki. |
