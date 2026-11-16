import { COLOR_PATTERN, normalizeColor, parsePalette } from './color';

describe('normalizeColor', () => {
    it('keeps a valid colour, in lower case', () => {
        expect(normalizeColor('#1A73E8')).toBe('#1a73e8');
    });

    it('adds the missing "#" and trims', () => {
        expect(normalizeColor('  e8710a ')).toBe('#e8710a');
    });

    it('expands a three-digit colour', () => {
        expect(normalizeColor('#AbC')).toBe('#aabbcc');
        expect(normalizeColor('fff')).toBe('#ffffff');
    });

    it('makes an empty value null', () => {
        expect(normalizeColor('')).toBeNull();
        expect(normalizeColor('   ')).toBeNull();
        expect(normalizeColor(null)).toBeNull();
        expect(normalizeColor(undefined)).toBeNull();
    });

    it('returns anything else as typed', () => {
        expect(normalizeColor('red')).toBe('red');
        expect(normalizeColor('#12345')).toBe('#12345');
    });
});

describe('parsePalette', () => {
    it('keeps the valid colours, normalised and unique', () => {
        expect(parsePalette('#1A73E8; e8710a ;#fff; red; #1a73e8')).toEqual([
            '#1a73e8',
            '#e8710a',
            '#ffffff',
        ]);
    });

    it('is empty without options', () => {
        expect(parsePalette(undefined)).toEqual([]);
        expect(parsePalette('')).toEqual([]);
    });
});

describe('COLOR_PATTERN', () => {
    it('matches #rrggbb only', () => {
        expect(COLOR_PATTERN.test('#a1b2c3')).toBe(true);
        expect(COLOR_PATTERN.test('#abc')).toBe(false);
        expect(COLOR_PATTERN.test('a1b2c3')).toBe(false);
    });
});
