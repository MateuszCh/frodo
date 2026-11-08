import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { VisitsChartComponent } from './visits-chart';
import type { VisitDay } from '../../../models/models';

beforeEach(() => {
    localStorage.setItem('frodo.lang', 'en');
    localStorage.removeItem(PREFS);
});
afterEach(() => {
    localStorage.removeItem('frodo.lang');
    localStorage.removeItem(PREFS);
});

/** what the tab remembers (analytics-prefs.ts) */
const PREFS = 'frodo.analytics';
const stored = () => JSON.parse(localStorage.getItem(PREFS) ?? '{}');

const day = (d: string, entries: number, unique = 0, nav = 0): VisitDay => ({ day: d, entries, unique, loads: entries, nav });

async function render(days: VisitDay[]) {
    TestBed.configureTestingModule({ imports: [VisitsChartComponent], providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(VisitsChartComponent);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const settle = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };
    const heights = () => [...root.querySelectorAll<HTMLElement>('.chart__bar')].map((b) => parseFloat(b.style.height));
    const label = () => root.querySelector('.chart__area')!.getAttribute('aria-label');
    const radios = (group: string) => [...root.querySelectorAll<HTMLInputElement>(`${group} input[type="radio"]`)];
    const chips = () => [...root.querySelectorAll<HTMLButtonElement>('.metric-chip')];
    const lines = () => [...root.querySelectorAll('.chart__line')].map((l) => l.getAttribute('class'));
    const pickKind = async (index: number) => {
        radios('.chart-toolbar__kind')[index].click();
        await settle();
    };
    return { fixture, root, heights, label, radios, chips, lines, settle, pickKind };
}

describe('VisitsChartComponent', () => {
    it('draws a bar per day with visits against a round scale, with a summary for screen readers', async () => {
        const { root, heights, label } = await render([day('2026-11-01', 10), day('2026-11-02', 0), day('2026-11-03', 37)]);
        expect(heights()).toEqual([25, 92.5]);
        expect([...root.querySelectorAll('.chart__tick')].map((t) => t.textContent?.trim())).toEqual([
            '0',
            '10',
            '20',
            '30',
            '40',
        ]);
        expect(label()).toBe('Entries over 3 days: 47');
        expect(root.querySelector('.chart__bar')!.classList).toContain('series-entries');
    });

    it('switches the bars between the metrics, page views being loads and transitions together', async () => {
        const { root, heights, label, radios, settle } = await render([
            day('2026-11-01', 10, 2, 8),
            day('2026-11-02', 4, 4, 0),
        ]);
        const metrics = () => radios('.chart-toolbar__metrics');
        expect([...root.querySelectorAll('.chart-toolbar__metrics .segmented__option')].map((o) => o.textContent?.trim())).toEqual([
            'Entries',
            'Unique',
            'Page loads',
            'Transitions',
            'Page views',
        ]);

        metrics()[3].click();
        await settle();
        expect(heights()).toEqual([100]);
        expect(label()).toBe('Transitions over 2 days: 8');

        metrics()[4].click();
        await settle();
        // 18 and 4 views against a scale of 0–20
        expect(heights()).toEqual([90, 20]);
        expect(label()).toBe('Page views over 2 days: 22');
    });

    it('draws lines of several metrics, starting from the metric of the bars', async () => {
        const { root, radios, chips, lines, label, settle, pickKind } = await render([
            day('2026-11-01', 10, 2, 8),
            day('2026-11-02', 4, 4, 0),
        ]);
        radios('.chart-toolbar__metrics')[1].click();
        await settle();
        await pickKind(1);

        expect(root.querySelector('.chart__bar')).toBeNull();
        expect(lines()).toEqual(['chart__line series-unique']);
        // one line gets a fill under it
        expect(root.querySelectorAll('.chart__fill').length).toBe(1);
        expect(chips().map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false', 'false']);

        chips()[0].click();
        chips()[4].click();
        await settle();
        // in the fixed order of the metrics, without fills
        expect(lines()).toEqual(['chart__line series-entries', 'chart__line series-unique', 'chart__line series-views']);
        expect(root.querySelectorAll('.chart__fill').length).toBe(0);
        expect(label()).toBe(
            'Entries over 2 days: 14; Unique over 2 days: 6; Page views over 2 days: 22',
        );
        // the scale fits the highest line: 18 views
        expect(root.querySelector('.chart__line.series-views')!.getAttribute('points')).toBe('5,10 15,80');
    });

    it('keeps the last line, and goes back to bars of the first one', async () => {
        const { root, chips, lines, heights, settle, pickKind } = await render([day('2026-11-01', 10, 2, 8)]);
        await pickKind(1);
        chips()[0].click();
        await settle();
        expect(lines()).toEqual(['chart__line series-entries']);

        chips()[3].click();
        await settle();
        chips()[0].click();
        await settle();
        expect(lines()).toEqual(['chart__line series-nav']);

        await pickKind(0);
        expect(root.querySelector('.chart__bar')!.classList).toContain('series-nav');
        expect(heights()).toEqual([100]);
    });

    it('shows the values of the hovered day', async () => {
        const { root, settle, pickKind, chips } = await render([day('2026-11-01', 10, 2, 8), day('2026-11-02', 4, 4, 0)]);
        await pickKind(1);
        chips()[3].click();
        await settle();
        root.querySelectorAll('.chart__hit')[1].dispatchEvent(new Event('mouseenter'));
        await settle();
        const tip = root.querySelector('.chart-tip')!;
        expect(tip.querySelector('.chart-tip__day')?.textContent).toBe('Mon, Nov 2, 2026');
        expect(
            [...tip.querySelectorAll('.chart-tip__row')].map((r) => [
                r.querySelector('.chart-tip__label')?.textContent,
                r.querySelector('.chart-tip__value')?.textContent,
            ]),
        ).toEqual([
            ['Entries', '4'],
            ['Transitions', '0'],
        ]);
        expect(root.querySelectorAll('.chart__marker').length).toBe(2);

        root.querySelector('.chart__area')!.dispatchEvent(new Event('mouseleave'));
        await settle();
        expect(root.querySelector('.chart-tip')).toBeNull();
    });

    it('remembers the kind, the metric of the bars and the lines', async () => {
        const { radios, chips, settle, pickKind } = await render([day('2026-11-01', 10, 2, 8)]);
        radios('.chart-toolbar__metrics')[2].click();
        await settle();
        expect(stored()).toMatchObject({ chartKind: 'bar', chartMetric: 'loads' });

        await pickKind(1);
        chips()[4].click();
        await settle();
        expect(stored()).toMatchObject({ chartKind: 'line', chartLines: ['loads', 'views'] });
    });

    it('starts with the remembered choices', async () => {
        localStorage.setItem(PREFS, JSON.stringify({ chartKind: 'line', chartMetric: 'nav', chartLines: ['views', 'entries'] }));
        const { root, lines, pickKind } = await render([day('2026-11-01', 10, 2, 8)]);
        expect(root.querySelector('.chart__bar')).toBeNull();
        expect(lines()).toEqual(['chart__line series-entries', 'chart__line series-views']);
        await pickKind(0);
        // bars of the first line
        expect(root.querySelector('.chart__bar')!.classList).toContain('series-entries');
    });

    it('ignores remembered values it does not know', async () => {
        localStorage.setItem(PREFS, JSON.stringify({ chartKind: 'pie', chartMetric: 'clicks', chartLines: [] }));
        const { root, label } = await render([day('2026-11-01', 10, 2, 8)]);
        expect(root.querySelector('.chart__bar')!.classList).toContain('series-entries');
        expect(label()).toBe('Entries over 1 day: 10');
    });

    it('labels at most eight days under a long period', async () => {
        const days = Array.from({ length: 90 }, (_, i) =>
            day(new Date(Date.UTC(2026, 7, 1) + i * 86400000).toISOString().slice(0, 10), i),
        );
        const { root } = await render(days);
        expect(root.querySelectorAll('.chart__label').length).toBeLessThanOrEqual(8);
    });
});
