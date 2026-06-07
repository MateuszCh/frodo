import { BytesPipe } from './bytes.pipe';

describe('BytesPipe', () => {
    let pipe: BytesPipe;

    beforeEach(() => {
        pipe = new BytesPipe();
    });

    it('returns "-" for null', () => {
        expect(pipe.transform(null)).toBe('-');
    });

    it('returns "-" for undefined', () => {
        expect(pipe.transform(undefined)).toBe('-');
    });

    it('returns "-" for NaN', () => {
        expect(pipe.transform(NaN)).toBe('-');
    });

    it('returns "-" for Infinity', () => {
        expect(pipe.transform(Infinity)).toBe('-');
    });

    it('returns "0 bytes" for 0', () => {
        expect(pipe.transform(0)).toBe('0 bytes');
    });

    it('returns "1.0 bytes" for 1', () => {
        expect(pipe.transform(1)).toBe('1.0 bytes');
    });

    it('returns "1.0 kB" for 1024', () => {
        expect(pipe.transform(1024)).toBe('1.0 kB');
    });

    it('returns "1.0 MB" for 1024²', () => {
        expect(pipe.transform(1024 * 1024)).toBe('1.0 MB');
    });

    it('returns "1.0 GB" for 1024³', () => {
        expect(pipe.transform(1024 ** 3)).toBe('1.0 GB');
    });

    it('respects the precision parameter', () => {
        expect(pipe.transform(1536, 2)).toBe('1.50 kB');
    });

    it('supports precision 0', () => {
        expect(pipe.transform(1024, 0)).toBe('1 kB');
    });
});
