/**
 * Just enough Polish grammar for labels built from a post type title
 * ("Nowy marker", "Nowa ikona", "Edytuj ikonę"). The gender is read from the
 * ending of the first word, which is the head noun in titles like "Punkt widokowy".
 *
 * Known limits: masculine nouns ending in -a (kierowca), feminine nouns ending in a
 * consonant other than -ść (noc, twarz), and animate masculine nouns, whose
 * accusative differs (autor → autora), come out wrong.
 */
export type PolishGender = 'm' | 'f' | 'n';

// words whose ending points to the wrong gender
const EXCEPTIONS = new Map<string, PolishGender>([['album', 'm']]);

export function polishGender(phrase: string): PolishGender {
    const word = firstWord(phrase);
    const exception = EXCEPTIONS.get(word);
    if (exception) {
        return exception;
    }
    if (/(o|e|ę|u|um)$/.test(word)) {
        return 'n'; // wydarzenie, geostanowisko, imię, menu, muzeum
    }
    if (/(a|ść)$/.test(word)) {
        return 'f'; // ikona, nawigacja, galeria, aktualność
    }
    return 'm'; // marker, artykuł, punkt
}

/**
 * Accusative of the phrase ("Edytuj …"), or null when it cannot be built safely:
 * in a feminine phrase of several words the following adjective changes as well
 * (strona główna → stronę główną) and cannot be told apart from a noun.
 */
export function polishAccusative(phrase: string): string | null {
    const text = phrase.trim();
    if (polishGender(text) !== 'f') {
        // inanimate masculine and neuter nouns keep the nominative form
        return text;
    }
    if (/\s/.test(text)) {
        return null;
    }
    // ikona → ikonę, nawigacja → nawigację; aktualność stays
    return text.endsWith('a') ? `${text.slice(0, -1)}ę` : text;
}

function firstWord(phrase: string): string {
    return (phrase.trim().split(/\s+/)[0] ?? '').toLowerCase();
}
