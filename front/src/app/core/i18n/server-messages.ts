/**
 * Polish texts for messages sent by the backend (server/controllers, app.js and the
 * Mongoose model validators). The English interface shows the server text as it is;
 * a message that is not listed here is shown unchanged in both languages.
 * `$1` in a Polish text is the part captured by the pattern (a url, a type, an id).
 */
interface ServerMessage {
    pattern: RegExp;
    pl: string;
}

const SERVER_MESSAGES: ServerMessage[] = [
    // removed (the listing shows this text in the "removed" row)
    { pattern: /^Post removed successfully$/, pl: 'Wpis został usunięty' },
    { pattern: /^Page removed successfully$/, pl: 'Strona została usunięta' },
    { pattern: /^(.+) type removed successfully$/, pl: 'Typ „$1” został usunięty' },
    { pattern: /^File removed successfully$/, pl: 'Plik został usunięty' },

    // user and session
    { pattern: /^Incorrect username$/, pl: 'Nieprawidłowa nazwa użytkownika' },
    { pattern: /^Incorrect password$/, pl: 'Nieprawidłowe hasło' },
    { pattern: /^Wrong password$/, pl: 'Nieprawidłowe obecne hasło' },
    {
        pattern: /^Incorrect data$/,
        pl: 'Nieprawidłowe dane: nowe hasła muszą być takie same i różnić się od obecnego',
    },
    { pattern: /^Password changed$/, pl: 'Hasło zostało zmienione' },
    { pattern: /^There is no user with id: (.+)$/, pl: 'Nie ma użytkownika o id $1' },
    { pattern: /^unauthorized$/, pl: 'Brak dostępu' },
    { pattern: /^User not authenticated$/, pl: 'Użytkownik nie jest zalogowany' },

    // pages
    { pattern: /^There already is page with "(.*)" url\.$/, pl: 'Strona z adresem „$1” już istnieje.' },
    { pattern: /^Invalid page id$/, pl: 'Nieprawidłowe id strony' },
    { pattern: /^There is no page with id (.+)$/, pl: 'Nie ma strony o id $1' },
    { pattern: /^Duplicate urls$/, pl: 'Adresy importowanych stron powtarzają się' },
    { pattern: /^One of imported pages has already used url$/, pl: 'Adres jednej z importowanych stron jest już zajęty' },
    { pattern: /^There is no valid page to import$/, pl: 'Brak poprawnych stron do zaimportowania' },

    // posts
    { pattern: /^There is no (.+) post type\.$/, pl: 'Nie ma typu wpisu „$1”.' },
    { pattern: /^There is no valid posts to import$/, pl: 'Brak poprawnych wpisów do zaimportowania' },
    { pattern: /^Invalid post id$/, pl: 'Nieprawidłowe id wpisu' },
    { pattern: /^There is no post with id (.+)$/, pl: 'Nie ma wpisu o id $1' },

    // post types and components
    { pattern: /^There is no post type with id (.+)$/, pl: 'Nie ma typu wpisu o id $1' },
    { pattern: /^There is no post type with type (.+)$/, pl: 'Nie ma typu wpisu „$1”' },
    { pattern: /^There is no post type with ?$/, pl: 'Nie ma takiego typu wpisu' },
    { pattern: /^There already is "(.*)" type$/, pl: 'Typ „$1” już istnieje' },
    { pattern: /^Duplicate field ids$/, pl: 'Id pól powtarzają się' },
    { pattern: /^Duplicate types$/, pl: 'Typy importowanych pozycji powtarzają się' },
    { pattern: /^Some of imported post type already exists$/, pl: 'Część importowanych typów już istnieje' },
    { pattern: /^There is no valid post types to import$/, pl: 'Brak poprawnych typów do zaimportowania' },

    // files
    { pattern: /^There was error uploading files$/, pl: 'Wystąpił błąd podczas przesyłania plików' },
    { pattern: /^There is no file to remove$/, pl: 'Nie ma pliku do usunięcia' },
    { pattern: /^There is no valid file to import$/, pl: 'Brak poprawnych plików do zaimportowania' },

    // model validation (server/models)
    { pattern: /^title of post type is required$/, pl: 'Tytuł typu jest wymagany' },
    { pattern: /^plural title of post type is required$/, pl: 'Tytuł w liczbie mnogiej jest wymagany' },
    { pattern: /^type of post type is required$/, pl: 'Typ jest wymagany' },
    { pattern: /^Each field should have a different id$/, pl: 'Każde pole musi mieć inne id' },
    { pattern: /^Title of page is required$/, pl: 'Tytuł strony jest wymagany' },
    { pattern: /^Url of page is required$/, pl: 'Adres strony jest wymagany' },
    { pattern: /^Username is required$/, pl: 'Nazwa użytkownika jest wymagana' },
    { pattern: /^Passwor?d? is required$/, pl: 'Hasło jest wymagane' },
    { pattern: /^title of field is required$/, pl: 'Tytuł pola jest wymagany' },
    { pattern: /^type of field is required$/, pl: 'Typ pola jest wymagany' },
    { pattern: /^id of field is required$/, pl: 'Id pola jest wymagane' },
    {
        pattern: /^Each field in the same level should have a different id$/,
        pl: 'Pola na tym samym poziomie muszą mieć różne id',
    },
    { pattern: /^Title of post is required$/, pl: 'Tytuł wpisu jest wymagany' },
    { pattern: /^Type of post is required$/, pl: 'Typ wpisu jest wymagany' },
    { pattern: /^Filename is required$/, pl: 'Nazwa pliku jest wymagana' },
];

// Mongoose: "Post validation failed: title: Title of post is required, type: …"
const VALIDATION = /^\w+ validation failed: (.+)$/;
const VALIDATION_PART = /, (?=[\w.$]+: )/;

/** Polish text for a backend message; unknown messages come back unchanged. */
export function serverMessageInPolish(message: string): string {
    const validation = VALIDATION.exec(message);
    if (validation) {
        const details = validation[1].split(VALIDATION_PART).map((part) => {
            const separator = part.indexOf(': ');
            return translate(separator >= 0 ? part.slice(separator + 2) : part);
        });
        return `Nieprawidłowe dane: ${details.join('; ')}`;
    }
    return translate(message);
}

function translate(message: string): string {
    const known = SERVER_MESSAGES.find(({ pattern }) => pattern.test(message));
    return known ? message.replace(known.pattern, known.pl) : message;
}
