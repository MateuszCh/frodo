import { groupDays, unitFor, unitsFor } from './visit-groups';
import type { VisitDay } from '../../models/models';

/** Intl puts thin spaces around the dash of a range: plain ones to compare. */
const plain = (text: string | null) => text?.replace(/\s/g, ' ') ?? null;

/** `count` days from `from`, each with 1 visitor, 2 visits and 3 views. */
function daysFrom(from: string, count: number): VisitDay[] {
    const start = Date.parse(`${from}T00:00:00Z`);
    return Array.from({ length: count }, (_, i) => ({
        day: new Date(start + i * 86400000).toISOString().slice(0, 10),
        visitors: 1,
        visits: 2,
        views: 3,
    }));
}

describe('visit-groups', () => {
    it('offers weeks from 32 days and months from 121, defaulting to the largest', () => {
        expect(unitsFor(1)).toEqual(['day']);
        expect(unitsFor(31)).toEqual(['day']);
        expect(unitsFor(32)).toEqual(['day', 'week']);
        expect(unitsFor(120)).toEqual(['day', 'week']);
        expect(unitsFor(121)).toEqual(['day', 'week', 'month']);
        expect(unitFor(90, null)).toBe('week');
        expect(unitFor(312, null)).toBe('month');
        // a remembered unit holds where the period offers it
        expect(unitFor(312, 'day')).toBe('day');
        expect(unitFor(90, 'month')).toBe('week');
        expect(unitFor(30, 'week')).toBe('day');
    });

    it('sums the days into weeks from Monday, marking the weeks the period cuts', () => {
        // Thursday 29 October to Sunday 15 November 2026
        const weeks = groupDays(daysFrom('2026-10-29', 18), 'week', 'en-US');
        expect(weeks.map((w) => [plain(w.short), w.visitors, w.visits, w.views, plain(w.partial)])).toEqual([
            ['Oct 26 – Nov 1', 4, 8, 12, 'Oct 29 – Nov 1'],
            ['Nov 2 – 8', 7, 14, 21, null],
            ['Nov 9 – 15', 7, 14, 21, null],
        ]);
        expect(plain(weeks[1].full)).toBe('Nov 2 – 8, 2026');
    });

    it('sums the days into months, the year shown when the period crosses one', () => {
        const months = groupDays(daysFrom('2026-01-01', 312), 'month', 'pl');
        expect(months.length).toBe(11);
        expect(months[0]).toMatchObject({ short: 'sty', full: 'styczeń 2026', visits: 62, partial: null });
        // 1–8 November: the month so far
        expect(months[10]).toMatchObject({ short: 'lis', views: 24, partial: '1–8 lis' });

        const across = groupDays(daysFrom('2025-12-15', 40), 'month', 'en-US');
        expect(across.map((m) => m.short)).toEqual(['Dec 25', 'Jan 26']);
    });

    it('keeps the days as they are', () => {
        const days = groupDays(daysFrom('2026-11-07', 2), 'day', 'en-US');
        expect(days.map((d) => [d.key, d.short, d.partial])).toEqual([
            ['2026-11-07', 'Nov 7', null],
            ['2026-11-08', 'Nov 8', null],
        ]);
    });
});
