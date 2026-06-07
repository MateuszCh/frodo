import { parseOptions } from './parse-options';

describe('parseOptions', () => {
    it('returns [] for undefined', () => {
        expect(parseOptions(undefined)).toEqual([]);
    });

    it('returns [] for null', () => {
        expect(parseOptions(null)).toEqual([]);
    });

    it('returns [] for empty string', () => {
        expect(parseOptions('')).toEqual([]);
    });

    it('returns a single-item array for a single value', () => {
        expect(parseOptions('a')).toEqual(['a']);
    });

    it('splits by semicolon', () => {
        expect(parseOptions('a;b;c')).toEqual(['a', 'b', 'c']);
    });

    it('trims whitespace around semicolons', () => {
        expect(parseOptions('a ; b ; c')).toEqual(['a', 'b', 'c']);
    });

    it('deduplicates values', () => {
        expect(parseOptions('a;a;b')).toEqual(['a', 'b']);
    });

    it('filters out empty strings from leading, trailing, and double semicolons', () => {
        expect(parseOptions(';a;;b;')).toEqual(['a', 'b']);
    });
});
