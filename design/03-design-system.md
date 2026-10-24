# Etap 3: design system Frodo, kierunek C „Sage”

Stan na: 20.10.2026 (motyw ciemny i przełącznik dodane 20.10). Kierunek wybrany po etapie 2: **C „Sage”**. Charakteryzuje go morski akcent #0F766E, szałwiowe neutralne, krój IBM Plex Sans, biały blat roboczy i płaskie karty.

| Plik | Rola |
|---|---|
| `tokens.css` | Wszystkie tokeny: kolory w dwóch warstwach (prymitywy i role semantyczne), typografia, odstępy, promienie, cienie, rozmiary, breakpointy, z-index, ruch. |
| `components.css` | Referencyjne style wszystkich komponentów. Korzystają wyłącznie z tokenów semantycznych. Używają ich arkusz komponentów i makiety z etapu 4. |
| `icons.js` | Zestaw ikon i znak logo jako sprite SVG. |
| `03-komponenty.html` | Arkusz: każdy komponent z audytu we wszystkich stanach, plus układy w szerokościach 390 px i 1200 px. |
| `03-design-system.md` | Ten dokument, czyli zasady użycia tokenów i komponentów. |

Pliki makiet otwierają się bezpośrednio z dysku (`file://`). Font IBM Plex Sans jest w makietach ładowany z Google Fonts tylko na potrzeby podglądu. Docelowo będzie hostowany lokalnie.

---

## 1. Zasady

1. **Jedna akcja główna na ekranie.** Wypełniony przycisk w kolorze akcentu pojawia się raz na ekran: Save, New marker, Sign in, Upload albo Choose. Pozostałe akcje są drugorzędne (obrys) albo tekstowe.
2. **Jeden akcent.** Morski kolor oznacza akcję główną, zaznaczenie, aktywną pozycję nawigacji, link i fokus. Nie służy do dekoracji.
3. **Kolory statusów służą wyłącznie komunikatom.** Zieleń, czerwień, żółć i błękit pojawiają się w komunikatach, błędach pól i w wierszu „usunięto”. Jedynym wyjątkiem jest czerwony przycisk „Delete” w dialogu potwierdzenia usunięcia.
4. **Rama i blat.** Nawigacja i pasek górny leżą na szałwiowym tle, a praca toczy się na białym blacie (od 960 px) albo na białych kartach (mobile).
5. **Cień oznacza, że coś się unosi.** Karty są płaskie, z obramowaniem 1 px. Cień dostają tylko menu, panel select, kalendarz, dialog, arkusz, przeciągany komponent i przycisk „do góry”.
6. **Mobile-first, próg 960 px.** Style bazowe są mobilne, a desktop zaczyna się od 960 px. To ten sam próg, którego logika aplikacji używa do przełączania nawigacji.
7. **Komponenty znają tylko tokeny semantyczne.** Prymitywy (`--sage-*`, `--teal-*`…) występują wyłącznie w `tokens.css`.

---

## 2. Tokeny

### 2.1 Warstwy i nazewnictwo

| Warstwa | Przykład | Kto używa |
|---|---|---|
| Prymitywy | `--sage-50`, `--teal-600`, `--red-700` | wyłącznie warstwa semantyczna w `tokens.css` |
| Semantyczne (kolor) | `--color-surface`, `--color-text-muted`, `--color-accent-hover` | komponenty, szablony |
| Skale | `--space-4`, `--text-sm`, `--radius-lg`, `--shadow-md`, `--duration-normal` | komponenty, szablony |

Nazwy kolorów mają postać `--color-<rola>[-<wariant>]`, np. `--color-accent-subtle-text`. Skala odstępów to `--space-N`, gdzie N razy 4 px daje wartość (`--space-6` = 24 px).

### 2.2 Kolory

| Token | Wartość | Do czego | Kontrast |
|---|---|---|---|
| `--color-bg` | #F3F4F1 | tło aplikacji, nawigacja, pasek górny | tekst 15,07:1 |
| `--color-surface` | #FFFFFF | blat, karty, pola | tekst 16,64:1 |
| `--color-surface-overlay` | #FFFFFF | menu, kalendarz, dialog, arkusz, szuflada (w ciemnym motywie jaśniejsza od blatu) | tekst 16,64:1 |
| `--color-surface-sunken` | #EEF0EC | panel filtrów, podgląd pliku, tor przełącznika | tekst pomocniczy 4,97:1 |
| `--color-surface-hover` | #F8F9F7 | hover wiersza listy na białym | — |
| `--color-surface-selected` | #E1EFEB | zaznaczona opcja, zaznaczony plik do wysłania | tekst akcentu 6,41:1 |
| `--color-fill-hover` / `-pressed` | #E8EAE5 / #E1E4DE | hover i wciśnięcie przycisków tekstowych, pozycji menu | tekst pomocniczy 4,70:1 |
| `--color-border` | #E1E4DE | karty, separatory, wiersze (dekoracja) | — |
| `--color-border-control` | #C9CEC6 | obrys przycisku drugorzędnego, przerywane ramki | — |
| `--color-border-strong` | #7C857F | obrys pól i checkboxów (granica kontrolki) | 3,81:1 na białym, 3,32:1 na wklęsłej |
| `--color-text` | #18201C | tekst podstawowy | 16,64:1 |
| `--color-text-muted` | #4A544E | opisy, etykiety drugorzędne, przyciski tekstowe | 7,13:1 na tle |
| `--color-text-subtle` | #5F6963 | podpowiedzi, metadane, placeholder, numer wiersza | 4,65:1 na tle |
| `--color-text-disabled` | #7C857F | stan wyłączony (zwolniony z wymogu kontrastu) | — |
| `--color-accent` | #0F766E | akcja główna, zaznaczenie, link, fokus | biały tekst 5,47:1 |
| `--color-accent-hover` / `-pressed` | #115E59 / #134E4A | hover i wciśnięcie akcji głównej | 7,58:1 / 9,48:1 |
| `--color-accent-subtle` | #E1EFEB | tło aktywnej nawigacji, zaznaczenia, licznika | — |
| `--color-accent-subtle-text` | #115E59 | tekst na tle akcentu, aktywna zakładka | 6,41:1 |
| `--color-success` (+`-bg`, `-border`) | #15803D | komunikat sukcesu, wiersz „usunięto” | 4,79:1 na swoim tle |
| `--color-error` (+`-bg`, `-border`, `-halo`) | #B91C1C | błąd pola, komunikat błędu | 5,91:1 na swoim tle |
| `--color-warning` (+…) | #A16207 | rezerwa (dziś nie występuje) | 4,76:1 |
| `--color-info` (+…) | #1D4ED8 | rezerwa (dziś nie występuje) | 6,16:1 |
| `--color-danger` (+`-hover`, `-pressed`) | #B91C1C | wyłącznie przycisk „Delete” w dialogu potwierdzenia | biały tekst 6,47:1 |
| `--color-text-on-danger` | #FFFFFF | tekst na przycisku usuwania (biały w obu motywach) | — |
| `--color-nav-*` | — | nawigacja: tekst, hover, aktywna pozycja | aktywna 6,41:1 |
| `--color-backdrop` | rgb(24 32 28 / .45) | tło pod arkuszem, szufladą i dialogiem | — |

Zasady:
- Tekst zawsze ma kontrast co najmniej 4,5:1. Wyjątkiem jest stan wyłączony.
- `--color-border` jest dekoracyjny. Do granic, które identyfikują kontrolkę (pole, checkbox), służy wyłącznie `--color-border-strong`.
- Kolor akcentu nigdy nie jest tłem komunikatu, bo leży zbyt blisko zieleni sukcesu. Komunikat sukcesu zawsze ma ikonę.

### 2.3 Typografia

**Krój:** IBM Plex Sans (SIL OFL 1.1), wagi 400 / 500 / 600 / 700, podzbiory latin i latin-ext. Wartości techniczne (id pól, adresy URL, typy MIME) zapisujemy systemowym krojem o stałej szerokości (`--font-mono`), bez drugiego fontu webowego.

Hostowanie lokalne: osiem plików WOFF2 (4 wagi × latin i latin-ext) w `assets/fonts/`, deklaracje `@font-face` z `font-display: swap` i `unicode-range`. Link do Google Fonts w `index.html` znika, podobnie jak nieużywany font Material Icons.

| Token | Rozmiar / linia | Waga | Użycie |
|---|---|---|---|
| `--text-3xl` | 32 / 40 | 600 | tytuł ekranu od 960 px |
| `--text-2xl` | 26 / 32 | 600 | tytuł ekranu na mobile, tytuł edytora od 960 px |
| `--text-xl` | 20 / 28 | 600 | tytuł edytora na mobile, tytuł dialogu, logotyp |
| `--text-lg` | 18 / 26 | 600 | tytuł karty, panelu filtrów, nazwa pliku |
| `--text-md` | 16 / 24 | 400 | **tekst bazowy**, wartości pól, opcje menu |
| `--text-sm` | 14 / 20 | 600 / 400 | etykieta pola, przycisk / podpowiedź, metadane, komunikat |
| `--text-xs` | 12 / 16 | 600 | etykieta grupy nawigacji, numer wiersza, podpis stanu |

Zasady:
- Zdania zaczynamy wielką literą i nie piszemy wersalikami. Wyjątkiem są skróty („PDF”, „URL”).
- Od 20 px w górę stosujemy `--tracking-tight`.
- Liczby w licznikach, rozmiarach, współrzędnych i dacie kalendarza mają `font-variant-numeric: tabular-nums`.
- Długi tekst (opisy, akapity w polach) ma najwyżej ok. 70 znaków w linii, co zapewnia kolumna formularza o szerokości 720 px.

### 2.4 Odstępy

Skala: 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64 px (`--space-0-5` … `--space-16`).

| Miejsce | Wartość |
|---|---|
| Etykieta → pole → podpowiedź lub błąd | `--space-1-5` (6) |
| Między polami w formularzu | `--space-5` (20) |
| Między kartami i sekcjami | `--space-6` (24) |
| Wnętrze karty | 20 na mobile, 24 od 960 px |
| Wnętrze wiersza repeatera i karty definicji pola | `--space-4` (16) |
| Margines boczny strony (`--layout-gutter`) | 16 na mobile, 48 od 960 px |
| Między ikoną a tekstem w przycisku | `--space-2` (8) |
| Pod nagłówkiem ekranu | 24 na mobile, 32 od 960 px |

Odstępy między elementami rodzeństwa ustawiamy przez `gap` (grid lub flex), a nie przez marginesy pojedynczych elementów.

### 2.5 Kształt i głębia

| Token | Wartość | Użycie |
|---|---|---|
| `--radius-xs` | 6 | checkbox, znacznik techniczny, miniatura na liście wysyłania |
| `--radius-sm` | 8 | pozycja menu, górne rogi zakładki |
| `--radius-md` | 10 | pole formularza, kafel miniatury, komunikat, wiersz repeatera |
| `--radius-lg` | 16 | karta, panel filtrów, karta definicji pola i komponentu |
| `--radius-xl` | 20 | blat roboczy, dialog, arkusz mobilny |
| `--radius-full` | 999 | przyciski, pozycje nawigacji, wyszukiwarka, licznik, przełącznik |

| Token | Użycie |
|---|---|
| `--shadow-xs` | wybrany segment przełącznika (rezerwa) |
| `--shadow-sm` | przycisk „do góry” |
| `--shadow-md` | menu, panel select, kalendarz |
| `--shadow-lg` | dialog, arkusz, szuflada nawigacji, przeciągany komponent |
| `--shadow-focus` | pole formularza w fokusie (obrys + poświata) |

### 2.6 Rozmiary i układ

| Token | Wartość | Uwagi |
|---|---|---|
| `--control-h` | 44 px na mobile, 40 px od 960 px | przyciski, pola, select |
| `--control-h-sm` | 32 px | małe przyciski (Clear, Add row, akcje w kartach) |
| `--layout-sidebar-w` | 264 px | nawigacja od 960 px (dziś 342 px) |
| `--layout-filters-w` | 288 px | panel filtrów |
| `--layout-details-w` | 360 px | panel szczegółów pliku |
| `--layout-content-max` | 1180 px | maksymalna szerokość treści ekranu listy |
| `--layout-form-max` | 720 px | kolumna formularzy edytorów (jak dziś) |
| `--layout-canvas-inset` | 12 px | odstęp blatu od krawędzi okna |
| `--layout-topbar-h` | 56 px | pasek górny na mobile |

### 2.7 Breakpointy

| Token | Próg | Klasa `LayoutService` | Co się zmienia |
|---|---|---|---|
| (bazowo) | < 600 | `size-s` | jedna kolumna, siatka miniatur 3 kolumny |
| `--bp-sm` | 600 | `size-m` | pola Title i Id obok siebie, 4 kolumny miniatur, dialog z przyciskami w rzędzie |
| `--bp-md` | **960** | `size-l` | stała nawigacja, blat roboczy, panel filtrów obok listy, akcje w rzędzie z tytułem, pasek edytora z akcjami u góry |
| `--bp-lg` | 1280 | `size-x` | szersze kolumny: panel szczegółów pliku obok siatki |
| `--bp-xl` | 1921 | `size-xl` | bez zmian, treść ograniczona do `--layout-content-max` |

Zapytania piszemy jako `@media (min-width: …)` z literalną wartością, bo `var()` nie działa w `@media`. Przy wdrożeniu powstanie mapa SCSS z tymi samymi liczbami. Klasy `size-*` na `<body>` zostają w logice, ale style z nich nie korzystają.

### 2.8 Warstwy (z-index)

| Token | Wartość | Element |
|---|---|---|
| `--z-raised` | 1 | przycisk w wierszu listy nad rozciągniętym linkiem |
| `--z-sticky` | 10 | nagłówek ekranu, pasek edytora, pasek górny, dolny pasek akcji |
| `--z-fab` | 20 | przycisk „do góry” |
| `--z-sheet-backdrop` / `--z-sheet` | 800 / 810 | tło i arkusz filtrów, szuflada nawigacji |
| `--z-overlay` | 1000 | kontener nakładek CDK (menu, select, kalendarz, dialog): wartość referencyjna |

Arkusz filtrów musi zostać poniżej 1000, żeby rozwinięty w nim select pojawił się nad arkuszem.

### 2.9 Ruch

| Token | Czas | Co animuje |
|---|---|---|
| `--duration-instant` | 80 ms | kolor tła i tekstu przy hover |
| `--duration-fast` | 120 ms | obrys i poświata fokusu pola |
| `--duration-normal` | 200 ms | obrót strzałki, pojawienie się miniatury, przycisk „do góry”, przesuwanie komponentów |
| `--duration-slow` | 280 ms | wejście arkusza i szuflady |

Krzywe: `--ease-standard` (zmiany stanu), `--ease-emphasized` (wejście arkusza, szuflady), `--ease-exit` (wyjście). Przy `prefers-reduced-motion: reduce` wszystkie czasy spadają do 1 ms. Nie animujemy rozmiaru fontu (dziś zmienia się w aktywnej pozycji menu) ani skali obrazów (dziś miniatury „wyrastają” od zera).

### 2.10 Motyw ciemny

Decyzja z 20.10.2026: aplikacja ma motyw jasny i ciemny oraz przełącznik **Light / Dark** bez opcji „System”.

- **Mechanizm.** Motyw ciemny to drugi zestaw wartości tokenów kolorów (warstwa 2) i cieni. Skale (typografia, odstępy, promienie, ruch) się nie zmieniają.
  - Atrybut `data-theme="light"` albo `"dark"` na `<html>` ustawia przełącznik.
  - Bez atrybutu, czyli przy pierwszym wejściu, zanim użytkownik coś wybierze, obowiązuje motyw z ustawień systemu (`prefers-color-scheme`).
  - Oba bloki w `tokens.css` (sekcja 11) muszą mieć identyczne wartości.
- **Kontrast (liczony):**
  - tekst co najmniej 4,64:1 na każdej powierzchni;
  - obramowanie pól co najmniej 3,89:1;
  - tekst na akcencie 8,79:1;
  - biały na czerwonym przycisku 4,57:1.

  Arkusz komponentów liczy kontrasty na żywo dla wybranego motywu: w obu jest 0 błędów.
- **Kluczowe wartości** (tła ciemnego motywu rozjaśnione dwukrotnie 20.10.2026 na prośbę o mniej głęboką czerń):

  | Rola | Jasny | Ciemny |
  |---|---|---|
  | `--color-bg` (rama, nawigacja) | #F3F4F1 | #1F2522 |
  | `--color-surface` (blat, karty, pola) | #FFFFFF | #272E2B |
  | `--color-surface-overlay` (menu, dialog, arkusz) | #FFFFFF | #303834 |
  | `--color-surface-sunken` (panel filtrów) | #EEF0EC | #2E3632 |
  | `--color-border` / `--color-border-strong` | #E1E4DE / #7C857F | #3C4540 / #8A958F |
  | `--color-text` / `-muted` / `-subtle` | #18201C / #4A544E / #5F6963 | #E8ECE9 / #BCC4C0 / #A3ADA7 |
  | `--color-accent` | #0F766E, biały tekst | #5CCFBF, ciemny tekst #05231F |
  | `--color-accent-subtle` / `-text` | #E1EFEB / #115E59 | #204741 / #8FE3D6 |
  | `--color-success` / `--color-error` | #15803D / #B91C1C | #6EE7A0 / #FCA5A5 |
  | `--color-danger` (przycisk) | #B91C1C | #D14343 |

- **Zasady:**
  - W ciemnym motywie akcent jest jaśniejszy, a tekst na nim ciemny. Hover rozjaśnia akcent zamiast go przyciemniać.
  - Elementy unoszące się (menu, dialog, arkusz, kalendarz, szuflada nawigacji) leżą na `--color-surface-overlay`, które w ciemnym motywie jest jaśniejsze od blatu. Sam cień na ciemnym tle prawie nie oddziela warstw.
  - Cienie mają w ciemnym motywie większe krycie (czarne, 30–60%).
  - Logo, favikona i obrazy się nie zmieniają. Znak w kolorze marki działa na obu tłach.
  - `color-scheme` przełącza się razem z motywem, więc natywne kontrolki (kalendarz przeglądarki, paski przewijania, strzałki pól liczbowych) też ciemnieją.

---

## 3. Ikony

Jeden zestaw w `icons.js`: siatka 24 px, obrys 1,75 px, zaokrąglone końce, kolor z `currentColor`. We wdrożeniu każdy symbol staje się plikiem `assets/icons/<nazwa>.svg` rejestrowanym w `MatIconRegistry` (`registerAppIcons()`), a stare pliki z wpisanym kolorem znikają.

| Ikona | Gdzie | Zastępuje |
|---|---|---|
| `menu` | pasek górny | `menu.svg` (biała) |
| `arrow-up` | przycisk „do góry” | `arrow.svg` (biała) |
| `chevron-down` | select, zwijanie komponentu strony, okres kalendarza | `arrow-down.svg`, `arrow-black.svg` |
| `sort` | przycisk sortowania | `sort.svg` (biała) |
| `grip` | uchwyt przeciągania | `hand-black.svg`, `hand-white.svg` |
| `x` | zamknięcie dialogu i arkusza, Clear, Remove | `close.svg`, `close-black.svg` |
| `plus`, `pencil`, `trash`, `upload`, `download`, `search`, `sliders`, `check`, `logout` | akcje | nowe |
| `layout`, `doc`, `image`, `braces`, `blocks` | nawigacja: Pages, typy wpisów, Files, Post types, Components | nowe |
| `file`, `folder`, `link`, `calendar`, `user`, `lock`, `chevron-left`, `chevron-right` | pliki, kalendarz, formularze | nowe |
| `check-circle`, `alert`, `info`, `warning` | komunikaty | nowe |

Zasady:
- Ikona obok tekstu ma `aria-hidden="true"`.
- Przycisk z samą ikoną ma `aria-label` z obiektem, np. „Delete Kopalnia Guido” albo „Remove component Gallery”.
- Ikona nigdy nie zastępuje tekstu akcji głównej.
- Nie używamy ligatur fontu ikon (`<mat-icon>add</mat-icon>`), bo dopisują tekst do treści przycisku.

---

## 4. Logo i ikona aplikacji

- **Znak:** koło w kolorze `--color-brand` (#0F766E) z trzema falistymi warstwami. Dwie górne są białe, dolna jest w kolorze `--color-brand-light` (#A7E3D6).
- **Logotyp:** „frodo” małymi literami, IBM Plex Sans 600. W tekście nazwa aplikacji to nadal „Frodo”.
- **Pole ochronne:** co najmniej połowa średnicy znaku. Minimalny rozmiar znaku to 16 px (favikona).
- **Pliki do podmiany:**
  - `favicon.svg` to sam znak;
  - `favicon.ico` 32 px;
  - `apple-touch-icon.png` 180 px i `icon-192/512.png`: znak na kwadracie w kolorze marki z promieniem około 22%.
- **Kolory w `index.html` i `site.webmanifest`:** `theme-color` i `theme_color` #0F766E, `background_color` #F3F4F1.
- Logo nie jest nagłówkiem `h1`. Na każdym ekranie `h1` to tytuł ekranu albo edytora.

---

## 5. Komponenty

Każdy komponent jest pokazany ze stanami w `03-komponenty.html`. Klasy `.is-hover`, `.is-focus`, `.is-active` służą tylko do pokazania stanów. We wdrożeniu zastępują je `:hover`, `:focus-visible`, `:active` albo klasy Angular Material. „Angular” oznacza element, który dziś realizuje daną funkcję. Szczegóły wdrożenia opisze etap 5.

### 5.1 Przycisk
- **Warianty:**
  - **primary:** jedna akcja główna;
  - **secondary:** sterowanie widokiem (sortowanie, filtry, wybór plików, dodawanie wiersza lub pola);
  - **ghost:** akcje poboczne (Edit type, Import, Export, Reset, Clear) i usuwanie w listach i formularzach;
  - **danger:** tylko „Delete” w dialogu potwierdzenia;
  - **ikona:** przycisk z samą ikoną;
  - **mały:** 32 px.
- **Stany:** domyślny, hover, fokus (obrys 2 px + odstęp 2 px), wciśnięty, wyłączony (szare wypełnienie zamiast przezroczystości), w toku.
- **W toku:** spinner, czasownik w formie ciągłej („Saving…”, „Importing…”), `aria-busy="true"`, brak reakcji na kliknięcia. Zastępuje dzisiejszą klasę `.busy` (`opacity: .6`), która nie blokowała klawiatury.
- Kształt pigułki, etykieta 14 px / 600, ikona 18 px po lewej.
- **Angular:** primary `mat-flat-button`, secondary `mat-stroked-button`, ghost `mat-button`, ikona `mat-icon-button`.

### 5.2 Przycisk „do góry”
- Okrągły, 48 px, na białym tle z cieniem `--shadow-sm`. Pojawia się po przewinięciu (`.is-visible`).
- Ukryty ma `visibility: hidden`, więc znika też z kolejności tabulacji.
- Zacznie działać, gdy przewijanym elementem stanie się `#scroll`. Dziś przewijają się wewnętrzne kontenery i przycisk nigdy się nie pokazuje.

### 5.3 Menu (sortowanie)
- Wyzwalacz to przycisk drugorzędny z ikoną `sort` i nazwą bieżącego sortowania (np. „Newest”).
- Panel: opcje stałe, a po etykiecie „Fields” pola typu wpisu. Aktywna opcja ma tło `--color-surface-selected` i znacznik.
- Stany pozycji: domyślna, hover, fokus klawiatury (wewnętrzny obrys), aktywna.
- **Angular:** `mat-menu`.

### 5.4 Pole tekstowe
- Etykieta nad polem (nie „pływa”). Pole wymagane ma gwiazdkę w kolorze `--color-text-subtle` i atrybut `required`.
- **Stany:** domyślne, hover, fokus (obrys akcentu + poświata), wypełnione, błąd (czerwony obrys + komunikat z ikoną pod polem), błąd z fokusem, wyłączone.
- **Warianty:** tekst, wielowierszowe (min. 112 px, rozciągane w pionie), liczba (cyfry tabelaryczne), hasło, z podpowiedzią.
- Komunikat błędu ma `aria-invalid="true"` + `aria-describedby`. Po nieudanym zapisie logika przewija do pierwszego błędu, tak jak dziś.
- **Angular:** `matInput` + `ngModel`, błąd w miejscu `mat-error`.

### 5.5 Select i multiselect
- Wyzwalacz wygląda jak pole, ze strzałką `chevron-down`, która obraca się po otwarciu. Pusty select ma podpowiedź („Choose a field type”, „Choose a component”).
- Panel to ten sam komponent co menu. Opcja wybrana ma tło akcentu i znacznik, a w multiselect checkbox przed nazwą.
- **Stany:** pusty, wybrana wartość, kilka wartości, błąd, wyłączony, otwarty.
- **Angular:** `mat-select` (`multiple`), panel przez `panelClass`.

### 5.6 Checkbox
- Pole „True/False”. Kwadrat 20 px, zaznaczony wypełniony akcentem z białym znacznikiem.
- **Stany:** niezaznaczony, zaznaczony, hover, fokus, wyłączony (oba warianty).
- Etykieta to sam tytuł pola, bez dzisiejszego dopisku „: true”.
- **Angular:** `mat-checkbox`.

### 5.7 Przełącznik True / False / All
- Filtr pola True/False w panelu filtrów. Trzy segmenty, wybrany ma tło i tekst akcentu.
- **Stany:** każdy z trzech wybrany, hover, fokus.
- **Angular:** `mat-radio-group` z trzema `mat-radio-button`, kółka ukryte stylami.

### 5.8 Data
- Pole z przyciskiem kalendarza wewnątrz. Kalendarz: nagłówek z miesiącem i strzałkami, siatka 7 kolumn, dzisiejszy dzień z obrysem, wybrany wypełniony akcentem.
- **Stany dnia:** domyślny, hover, fokus, dzisiaj, wybrany.
- Format daty zależy od lokalizacji przeglądarki, tak jak dziś.
- **Angular:** `matDatepicker`, `mat-datepicker-toggle`.

### 5.9 Pole z „Clear”
- Select, multiselect, katalog i data mają obok przycisk tekstowy „Clear” z ikoną `x`. Jest neutralny, nie czerwony.
- Na mobile przycisk zostaje w rzędzie z polem (pole się zwęża).

### 5.10 Pole pliku
- **Bez pliku:** przerywana ramka, „No file selected” i „Select file” (przycisk drugorzędny, mały).
- **Z plikiem:** podgląd 4:3 (maks. 320 px), „Select file” i „Clear”. PDF ma kafel z ikoną `file`.
- **Angular:** `.field-file`. Dialog wyboru jak w 5.24.

### 5.11 Repeater
- Tytuł pola i licznik wierszy. Każdy wiersz to ramka z numerem („Row 1”, generowanym w CSS przez `counter()`), polami i przyciskiem „Delete row” (tekstowy, mały). Pod wierszami „Add row”.
- **Zagnieżdżenie:** wiersze kolejnych poziomów mają naprzemienne tło (białe, wklęsłe, białe…) zamiast rosnących wcięć, więc na mobile nie tracą szerokości.
- **Stany:** pusty („No rows yet.”), z wierszami, zagnieżdżony, pole w wierszu w dowolnym stanie z 5.4.
- **Angular:** `app-repeater` ↔ `app-field`. Rekurencja i nazwy kontrolek bez zmian.

### 5.12 Komunikat
- Ramka z ikoną i tłem statusu: błąd (`role="alert"`), sukces (`role="status"`). Ostrzeżenie i informacja to rezerwa.
- Miejsce na komunikat jest zarezerwowane, więc formularz nie skacze. Pusty komunikat jest niewidoczny.
- Używany w logowaniu i na koncie. Treść błędu przychodzi z serwera bez zmian.

### 5.13 Nawigacja
- Panel na tle aplikacji, logo u góry.
- **Grupy:** Content (Pages + typy wpisów z menu), Media (Files), Structure (Post types, Components).
- Stopka: konto (awatar z pierwszą literą nazwy, nazwa użytkownika, „Account settings”) i przycisk „Log out” z ikoną. Wylogowanie w toku pokazuje spinner.
- **Stany pozycji:** domyślna, hover, aktywna (tło akcentu, waga 600, ikona w kolorze tekstu), fokus. Rozmiar tekstu się nie zmienia.
- **Od 960 px** panel jest stały (`mat-sidenav` „side”), **poniżej** wysuwa się z lewej nad tłem (`mat-sidenav` „over”).
- „Log out” jest przyciskiem, a nie elementem `<a>` bez `href`.
- **Angular:** `app-sidenav` w `mat-sidenav`. Pozycje to `a[routerLink]` z `aria-current="page"`.

### 5.14 Pasek górny (mobile)
- 56 px, na tle aplikacji: przycisk menu (`aria-label="Open menu"`) i logo. Przyklejony do góry.
- Zastępuje pomarańczowy nagłówek z białym logo, który miał kontrast 2,16:1.

### 5.15 Nagłówek ekranu
- **Mobile:**
  - wiersz z tytułem, licznikiem i akcją główną;
  - pod nim akcje tekstowe w przewijanym w poziomie rzędzie (Edit type, Import, Export);
  - wyszukiwarka i sortowanie w pasku listy.
- **Od 960 px:** tytuł z licznikiem po lewej, akcje tekstowe i główna po prawej, w jednym rzędzie.
- Tytuł z logiki (`pages`, `post types`) zaczyna się wielką literą dzięki `::first-letter`, więc nie trzeba zmieniać logiki.
- **Angular:** `.listing-header`, `.files-header`.

### 5.16 Pasek edytora
- Nad tytułem stoi rodzaj elementu („Edit marker”, „New page”), a tytuł pokazuje na żywo wpisaną nazwę (pusty to „Untitled”).
- **Mobile:** Delete (tekstowy) i Save (główny, rozciągnięty) w dolnym pasku przyklejonym do ekranu, z odstępem na bezpieczny obszar telefonu.
- **Od 960 px:** akcje w pasku obok tytułu, a pasek jest przyklejony do góry blatu.
- **Angular:** jeden wspólny wzorzec zamiast trzech kopii `.editor-header` (post, post-type, page).

### 5.17 Karta i sekcja
- Białe tło, obramowanie 1 px, promień 16 px, bez cienia. Opcjonalny nagłówek: tytuł 18 px i jedno zdanie opisu.
- **Sekcje edytorów:**
  - wpis: dane podstawowe (Title), Fields;
  - strona: Basic information, Search engines, Components;
  - schemat: dane podstawowe, Fields.

### 5.18 Zakładki
- Tekst 14 px / 600. Aktywna ma kolor akcentu i podkreślenie 2 px.
- **Stany:** domyślna, hover, aktywna, fokus. Etykiety to „Library” i „Upload”.
- **Angular:** `mat-tab-group #tabs` zostaje, bo logika przełącza zakładkę po wysłaniu plików.

### 5.19 Wiersz listy
- Wysokość 60 px. Cały wiersz jest linkiem (rozciągnięty `::after`). Przycisk usuwania (ikona kosza) leży nad linkiem.
- **Stany:** domyślny, hover, fokus (obrys całego wiersza), usuwanie w toku (spinner w przycisku), usunięty (przez 2 s komunikat serwera na zielonym tle z ikoną).
- Pasek listy: wyszukiwarka (pigułka), sortowanie, a na mobile także „Filters”.
- **Angular:** `.listing-item`, stan z `lastRemoved` i `removeStatus`.

### 5.20 Znaczniki
- **Licznik** (tło akcentu): liczba pozycji przy tytule ekranu.
- **Neutralny:** typ pola w karcie definicji, liczba wierszy repeatera.
- **Kod:** wartości techniczne krojem o stałej szerokości.

### 5.21 Pusty stan
- Ikona w kole, tytuł 16 px / 600 i jedno zdanie. Akcja jest zawsze w nagłówku ekranu, więc pusty stan jej nie powtarza.
- **Warianty:** pusta lista, brak wyników, brak pól, brak plików, brak danych do filtrowania.

### 5.22 Filtry
- **Od 960 px:** panel na wklęsłym tle obok listy, przyklejony przy przewijaniu.
- **Mobile:** arkusz od dołu (maks. 88% wysokości) z uchwytem, tytułem, „Reset” i przyciskiem zamknięcia. Pod arkuszem ciemne tło, którego kliknięcie zamyka arkusz.
- **Grupy filtrów** w dzisiejszej kolejności: przełącznik True/False/All, select, multiselect, katalog, zakres liczb (Min–Max), zakres dat (From–To).
- Wyszukiwarka przeszła do paska listy. Ekrany stron, komponentów i typów wpisów nie mają już panelu filtrów, bo zawierał tylko wyszukiwarkę.
- **Angular:** `.listing-drawer` i `app-listing-filters`, stan `filtersOpen`.

### 5.23 Definicja pola (edytor typu wpisu i komponentu)
- Karta z nagłówkiem: nazwa pola na żywo (pusta to „Untitled field”), znacznik typu (`field.type`), usuwanie (ikona z etykietą „Delete field {nazwa}”).
- **Treść:** Title i Id (obok siebie od 600 px, Id krojem o stałej szerokości), Type, a dla select i multiselect Options z podpowiedzią o średnikach.
- **Repeater:** pola wiersza są wcięte i połączone linią po lewej, z przyciskiem „Add field to row”. Działa na dowolną głębokość.
- **Stany:** poprawna, z błędami pól, nowa.
- **Angular:** `app-add-field`. Rekurencja i nazwy kontrolek (`uid`) bez zmian.

### 5.24 Komponent strony (edytor strony)
- **Karta:**
  - uchwyt przeciągania na całej wysokości po lewej;
  - numer pozycji (licznik CSS);
  - przycisk zwijania z `aria-expanded` i etykietą „Show fields of {komponent}”, widoczny dopiero po wybraniu komponentu;
  - select komponentu;
  - usuwanie;
  - po rozwinięciu pola komponentu.
- **Stany:** bez wybranego komponentu, zwinięty, rozwinięty, hover na uchwycie, przeciągany (`.cdk-drag-preview`: cień `--shadow-lg`), miejsce docelowe (`.cdk-drag-placeholder`: przerywany obrys na wklęsłym tle), przesuwanie pozostałych (200 ms).
- **Angular:** `cdkDropList` › `cdkDrag` › `cdkDragHandle`, struktura bez zmian. Przeciąganie nadal działa tylko myszą i dotykiem.

### 5.25 Miniatura pliku
- Kwadratowy kafel, promień 10 px. Siatka: 3 kolumny (mobile), 4 (od 600 px), automatycznie min. 120 px (od 960 px). Dziś jest to sztywno 10 kolumn.
- **Stany:**
  - ładowanie: szare tło do czasu klasy `img-loaded`;
  - załadowana: obraz pojawia się przez 200 ms;
  - hover;
  - fokus;
  - zaznaczona (`.current`): obrys 3 px w kolorze akcentu i znacznik;
  - PDF: ikona `file` i napis „PDF”.

### 5.26 Szczegóły pliku
- Nazwa pliku, akcje, podgląd 4:3, metadane (Date, URL, Type, Size) i formularz w dzisiejszej kolejności: Title, Description, Author, Place, Position, Catalogues, New catalogue + Add.
- **W bibliotece** akcją główną jest Save. **W dialogu wyboru** akcją główną jest Choose, a Save staje się drugorzędny.
- **Od 1280 px** panel (`--layout-details-w`) stoi obok siatki, a poniżej pod nią.
- Bez zaznaczonego pliku panelu nie ma, a siatka zajmuje całą szerokość.

### 5.27 Wysyłanie
- **Bez plików:** przerywana ramka z ikoną, tytułem „Upload images or PDF files”, podpowiedzią o formatach i przyciskiem „Select files”. Opis nie wspomina o przeciąganiu, bo tej funkcji nie ma.
- **Z plikami:**
  - pasek akcji: Select files (drugorzędny), „Upload {n} files” (główny), „Clear list” (tekstowy);
  - lista plików z miniaturą (zaznaczony na tle akcentu);
  - panel zaznaczonego pliku: nazwa, rozmiar, „Remove” jako pierwszy przycisk, podgląd i formularz jak w 5.26.
- **Od 960 px** lista i panel stoją obok siebie, na mobile jedno pod drugim.

### 5.28 Pasek postępu
- Tor 6 px na `--color-fill-hover`, pasek w kolorze akcentu, nad nim „Uploading {n} files…” i procent. Pojawia się tylko w trakcie wysyłania.
- **Angular:** `mat-progress-bar mode="determinate"`.

### 5.29 Dialogi
- **Alert:** treść i „OK” (primary). Bez koloru statusu, bo dialog nie zna typu komunikatu. Treść z logiki i serwera bez zmian.
- **Potwierdzenie:** stały tytuł „Confirm deletion”, treść z logiki („Are you sure you want to delete …?”), przyciski „Cancel” (drugorzędny) i „Delete” (danger).
- Promień 20 px, cień `--shadow-lg`, szerokość maks. 440 px. Poniżej 600 px przyciski są w kolumnie na pełną szerokość, z akcją potwierdzającą na górze.
- **Angular:** `MessageDialogComponent` przez `MatDialog`. Tytuł potwierdzenia to stały tekst szablonu w trybie `confirm`.

### 5.30 Wybór pliku (dialog)
- Nagłówek „Choose a file” z przyciskiem zamknięcia, zakładki, filtry, siatka, panel szczegółów z „Choose”.
- Od 600 px dialog zajmuje 90vw × 85vh (wartości z TS), a poniżej 600 px cały ekran (nadpisanie przez `panelClass`).

### 5.31 Strona błędu
- Kod „404” krojem o stałej szerokości, tytuł „Page not found” i zdanie z podpowiedzią. Nawigacja jest widoczna, więc strona nie ma własnego linku powrotnego.

### 5.32 Szkielet aplikacji
- **Mobile:** pasek górny, treść na tle aplikacji w białych kartach, nawigacja wysuwana z lewej.
- **Od 960 px:** nawigacja 264 px i biały blat z promieniem 20 px, oddalony o 12 px od krawędzi okna.
- `mat-sidenav-content#scroll` staje się elementem przewijanym, a nagłówki są przyklejone (`position: sticky`). Przycisk „do góry” zaczyna działać, a `appInfiniteScroll` dalej znajduje przewijanego przodka.
- Na mobile pasek edytora przykleja się pod paskiem górnym (56 px), więc przycisk menu pozostaje dostępny.

### 5.33 Przełącznik motywu (dodane 20.10.2026)
- Dwie opcje radio z ikonami, `sun` (Light) i `moon` (Dark), w stopce nawigacji nad kontem, z etykietą „Theme”. Na telefonie przełącznik jest w wysuwanej nawigacji.
- Wybrana opcja ma tło `--color-surface-overlay` i cień `--shadow-xs`. Pozostałe stany: hover, fokus (obrys akcentu).
- Każda opcja ma `aria-label` („Light theme”, „Dark theme”) i `title`.
- Przy pierwszym wejściu zaznaczona jest opcja zgodna z ustawieniem systemu. Zmiana motywu działa od razu, bez przeładowania.
- **Logika (wyjątek od zasady „tylko style i szablony”):** mały serwis motywu, który:
  - czyta i zapisuje wybór w `localStorage` (np. klucz `frodo.theme`);
  - ustawia `data-theme` na `<html>`.

  Krótki skrypt w `index.html` ustawia atrybut przed startem Angulara, żeby strona nie mignęła jasnym motywem. `<meta name="theme-color">` dostaje dwie wersje z atrybutem `media` (#F3F4F1 i #1F2522).

### 5.34 Warstwa dialogu i menu (dodane w etapie 4)
- `.dialog-layer`: tło `--color-backdrop` i wyśrodkowany dialog, czyli odpowiednik `cdk-overlay-backdrop` + panelu. Wariant `--picker`: od 600 px 90vw × 85vh, poniżej cały ekran.
- `.menu--floating`: menu pod przyciskiem. W makiecie wyrównane do lewej na mobile i do prawej od 960 px, a w aplikacji położenie liczy CDK.

### 5.35 Układ biblioteki plików (dodane w etapie 4)
- Pasek: wyszukiwarka i filtr katalogów (obok siebie od 600 px). Pod nim siatka miniatur.
- Panel szczegółów: na mobile biała karta pod siatką, od 960 px na wklęsłym tle, od 1280 px kolumna 360 px obok siatki, przyklejona przy przewijaniu.
- Zakładka „Upload”: pasek akcji, opcjonalny pasek postępu, lista plików i panel opisu (obok siebie od 960 px).

### 5.36 Układ logowania (dodane w etapie 4)
- Logowanie bez nawigacji: wyśrodkowana karta (maks. 400 px) z logo, tytułem „Sign in”, jednym zdaniem opisu, polami z `autocomplete` i przyciskiem na całą szerokość. Pod przyciskiem zarezerwowane miejsce na komunikat.
- Brak konta użytkownika: komunikat informacyjny zamiast formularza.
- Konto: ekran w szkielecie aplikacji z nagłówkiem „Account” i kartą „Change password” (kolumna maks. 560 px).

---

## 6. Dostępność: lista kontrolna

- [ ] Kontrast tekstu ≥ 4,5:1, obramowania pól ≥ 3:1, **w obu motywach** (wartości w 2.2 i 2.10, liczone na żywo w arkuszu).
- [ ] Widoczny fokus wszędzie. Przyciski i linki mają obrys 2 px w kolorze akcentu z odstępem 2 px, a pola obrys z poświatą. Nigdzie nie ma `outline: none` bez zamiennika.
- [ ] Cele dotyku mają 44 px na mobile, 40 px na desktopie i co najmniej 32 px dla małych przycisków (WCAG 2.2 wymaga 24 px).
- [ ] Przyciski z samą ikoną mają `aria-label` z obiektem, a ikony dekoracyjne `aria-hidden`.
- [ ] Atrybuty stanów:
  - `aria-expanded` (zwijanie, select, sortowanie, menu),
  - `aria-current="page"` (nawigacja),
  - `aria-busy` (akcje w toku),
  - `aria-invalid` + `aria-describedby` (błędy),
  - `role="status"` (sukces, wiersz „usunięto”),
  - `role="alert"` (błędy formularza).
- [ ] Ukryte elementy (przycisk „do góry”, zamknięty arkusz, zamknięta szuflada) mają `visibility: hidden` i nie są w kolejności tabulacji.
- [ ] Na każdym ekranie jest jeden `h1` (tytuł ekranu lub edytora), a logo nie jest nagłówkiem.
- [ ] Logowanie i konto mają `autocomplete`: `username`, `current-password`, `new-password`.
- [ ] Animacje respektują `prefers-reduced-motion`.
- [ ] Do zrobienia poza zakresem: alternatywa klawiaturowa dla przeciągania komponentów strony.

---

## 7. Teksty interfejsu

Interfejs zostaje po angielsku. Zasady:
- zdania zaczynamy wielką literą;
- przyciski mówią, co się stanie („New marker”, „Upload 3 files”);
- komunikaty błędów nazywają problem i sposób naprawy;
- nie piszemy wersalikami.

Komunikaty generowane przez logikę i serwer (np. „Kopalnia Guido updated successfully”, „Duplicate field ids”) zostają bez zmian.

| Miejsce | Dziś | Nowy tekst |
|---|---|---|
| Listing: dodawanie | Add | New {typ}, np. „New marker”, „New page”, „New component”, „New post type” |
| Listing wpisów: edycja typu | Edit | Edit type |
| Listing: sortowanie | (sama ikona, „Sort by”) | ikona + bieżące sortowanie, np. „Newest” |
| Listing: wyszukiwanie | Search (w panelu) | placeholder „Search {lista}”, np. „Search markers” |
| Listing: pusta lista | There are no {title} yet | No {title} yet |
| Listing: brak wyników | There are no {title} matching your selection | No {title} match your search |
| Listing: brak danych do filtrowania | There are no {title} to filter | Nothing to filter yet |
| Filtry | filters / Reset Filters | Filters / Reset |
| Edytory: nagłówek | Edit {Type} / Add new {Type} | „Edit marker” / „New marker” + tytuł na żywo („Untitled”) |
| Edytory: walidacja | This is required | This field is required |
| Edytory: brak pól | There are no fields yet | No fields yet |
| Edytor strony | Add new component | Add component |
| Edytor strony: zwijanie | aria-label „toggle” | „Show fields of {komponent}” / „Hide fields of {komponent}” |
| Edytor strony: SEO | (bez sekcji) | sekcja „Search engines” |
| Edytor schematu | Add new field | Add field |
| Definicja pola | Select type | Type |
| Definicja pola | Options (separated by semicolons) | Options + podpowiedź „Separate options with semicolons.” |
| Definicja pola | Add new repeater field | Add field to row |
| Pole Type / Id | (brak) | podpowiedź „Lowercase letters and underscores, formatted as you type.” |
| Repeater | Add new row | Add row |
| Checkbox | {Title} : true | {Title} |
| Pole pliku | (brak) | No file selected |
| Pliki: zakładki | SELECT FILE / ADD NEW FILES | Library / Upload |
| Pliki: katalogi | Select catalogue / Add new catalogue | Catalogues / New catalogue |
| Wysyłanie | Upload / Delete files | Upload {n} files / Clear list |
| Wysyłanie: panel pliku | Delete | Remove |
| Dialog potwierdzenia | No / Yes | Cancel / Delete + tytuł „Confirm deletion” |
| Alert | Ok | OK |
| Dialog wyboru pliku | (brak tytułu) | Choose a file |
| Konto | Change Password | Change password |
| Nawigacja | Logout | Log out |
| Nawigacja | (brak) | grupy Content / Media / Structure, „Account settings” |
| Strona błędu | Something went wrong | Page not found + jedno zdanie |
| Przycisk „do góry” | Back to Top | Back to top |

Testy jednostkowe szukają części tych tekstów, np. „Add”, „Filters”, „Reset Filters”, „Ok”, „Yes”, „No”, „Delete files”, „SELECT FILE”. Zgodnie z decyzją z audytu przy wdrożeniu zostaną zaktualizowane razem z szablonami. Pełna lista jest w `01-audyt.md`, sekcja 6.2.

---

## 8. Integracja z Angular Material (zarys)

Szczegóły opisze etap 5. Kierunek:

1. `tokens.css` trafia do globalnych stylów jako pierwszy plik.
2. `mat.theme()` dostaje typografię IBM Plex Sans, a tokeny systemowe Material mapujemy na nasze role semantyczne, np.:
   ```scss
   html {
     --mat-sys-primary: var(--color-accent);
     --mat-sys-on-primary: var(--color-text-on-accent);
     --mat-sys-primary-container: var(--color-accent-subtle);
     --mat-sys-on-primary-container: var(--color-accent-subtle-text);
     --mat-sys-surface: var(--color-surface);
     --mat-sys-on-surface: var(--color-text);
     --mat-sys-on-surface-variant: var(--color-text-muted);
     --mat-sys-outline: var(--color-border-strong);
     --mat-sys-outline-variant: var(--color-border);
     --mat-sys-error: var(--color-error);
     --mat-sys-background: var(--color-bg);
   }
   ```
   Kształty i wysokości kontrolek ustawiamy przez miksiny `mat.*-overrides()` (button, form-field, select, menu, dialog, tabs, checkbox, datepicker, progress-bar).
3. Znikają wszystkie nadpisania z `!important` w `styles.scss`, mapa kolorów `_utilities.scss` (`.col-*`, `.bg-col-*`, `.font-*`, `.fs-*`) i globalne style pasków przewijania.
4. **Uwaga na kolizję nazw:** dzisiejszy globalny `.field` (białe pudełko z wewnętrznym cieniem wokół pola dynamicznego) ma tę samą nazwę co `.field` systemu (etykieta + kontrolka). Przy wdrożeniu stary styl znika, a szablon `app-field` przechodzi na nowe klasy. To samo dotyczy pomocniczych `.busy`, `.center` i `.full-width`.
5. Motyw ciemny przechodzi do komponentów Material sam, bo tokeny `--mat-sys-*` wskazują na nasze tokeny semantyczne. Nadpisania z punktu 2 nie mogą zawierać wartości wpisanych na sztywno.
6. Budżet stylów komponentu w `angular.json` (4 kB ostrzeżenie, 8 kB błąd) oznacza, że style komponentów trafiają do warstwy globalnej (`components.css` → partiale SCSS), a nie do plików `*.scss` poszczególnych komponentów.

---

## 9. Czego nie robić

- Nie używać prymitywów (`--teal-600`) ani wartości hex w komponentach. Tylko tokeny semantyczne.
- Nie stosować koloru statusu jako dekoracji ani do oznaczania akcji. Wyjątkiem jest „Delete” w dialogu.
- Nie dawać cienia kartom ani polom w spoczynku.
- Nie stawiać więcej niż jednego przycisku primary na ekranie (dialog ma swój).
- Nie animować rozmiaru fontu ani skali obrazów. Nie dodawać efektów bez funkcji.
- Nie ukrywać elementów samą przezroczystością (`opacity: 0`), bo zostają w kolejności tabulacji.
- Nie pisać etykiet wersalikami. Nie wpisywać na sztywno kolorów do plików SVG.
- Nie dodawać funkcji przy okazji redesignu (toast, wskaźnik ładowania przy nawigacji, przeciąganie plików, cofanie usunięcia). Takie pomysły trafiają na listę „poza zakresem / wymaga decyzji” w etapie 5. Jedyny przyjęty wyjątek to przełącznik motywu (decyzja z 20.10.2026).
- Nie wpisywać kolorów, które działają tylko w jednym motywie. Każdy kolor pochodzi z tokenu i musi mieć wartość w obu motywach.
