import { polishAccusative, polishGender } from './polish-grammar';

describe('polishGender', () => {
    it.each([
        ['marker', 'm'],
        ['Artykuł', 'm'],
        ['punkt widokowy', 'm'],
        ['album', 'm'],
        ['ikona', 'f'],
        ['Nawigacja', 'f'],
        ['galeria zdjęć', 'f'],
        ['aktualność', 'f'],
        ['wydarzenie', 'n'],
        ['geostanowisko', 'n'],
        ['muzeum', 'n'],
        ['menu', 'n'],
        ['imię', 'n'],
        ['constructor', 'm'],
    ])('%s is %s', (phrase, gender) => {
        expect(polishGender(phrase)).toBe(gender);
    });
});

describe('polishAccusative', () => {
    it.each([
        ['ikona', 'ikonę'],
        ['nawigacja', 'nawigację'],
        ['aktualność', 'aktualność'],
        ['marker', 'marker'],
        ['wydarzenie', 'wydarzenie'],
        ['punkt widokowy', 'punkt widokowy'],
    ])('%s → %s', (phrase, accusative) => {
        expect(polishAccusative(phrase)).toBe(accusative);
    });

    it('gives up on feminine phrases of several words', () => {
        expect(polishAccusative('strona główna')).toBeNull();
    });
});
