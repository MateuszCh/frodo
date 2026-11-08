import { dateOfDay, dayOfDate, niceScale, periodLabel, shortDay } from './visit-format';

describe('visit-format', () => {
    it('turns days into local dates and back', () => {
        const date = dateOfDay('2026-03-29');
        expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 2, 29, 0]);
        expect(dayOfDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });

    it('formats days as calendar days in both languages', () => {
        expect(shortDay('2026-11-07', 'en-US')).toBe('Nov 7');
        expect(periodLabel('2026-11-07', '2026-11-07', 'en-US')).toBe('November 7, 2026');
        expect(periodLabel('2026-10-01', '2026-10-31', 'en-US')).toMatch(/^October 1\s*–\s*31, 2026$/);
        expect(periodLabel('2026-10-01', '2026-10-31', 'pl')).toMatch(/października 2026$/);
    });

    it('picks a round scale with at most four steps', () => {
        expect(niceScale(0)).toEqual({ top: 4, ticks: [0, 1, 2, 3, 4] });
        expect(niceScale(37)).toEqual({ top: 40, ticks: [0, 10, 20, 30, 40] });
        expect(niceScale(40)).toEqual({ top: 40, ticks: [0, 10, 20, 30, 40] });
        expect(niceScale(1234)).toEqual({ top: 1500, ticks: [0, 500, 1000, 1500] });
    });
});
