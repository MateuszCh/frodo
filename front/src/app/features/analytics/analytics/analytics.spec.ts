import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { AnalyticsComponent, AnalyticsSection } from './analytics';
import type { VisitStats } from '../../../models/models';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts.
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

const makeStats = (overrides: Partial<VisitStats> = {}): VisitStats => ({
    from: '2026-11-01',
    to: '2026-11-03',
    days: [
        { day: '2026-11-01', entries: 3, unique: 2, loads: 4, nav: 6 },
        { day: '2026-11-02', entries: 0, unique: 0, loads: 0, nav: 0 },
        { day: '2026-11-03', entries: 1, unique: 1, loads: 1, nav: 1 },
    ],
    totals: { entries: 4, unique: 3, loads: 5, nav: 7 },
    singlePage: { visits: 4, single: 1 },
    previous: {
        from: '2026-10-29',
        to: '2026-10-31',
        totals: { entries: 5, unique: 3, loads: 4, nav: 6 },
        singlePage: { visits: 5, single: 3 },
    },
    pages: [
        { key: '/', page: { id: 1, title: 'Home' }, entries: 3, unique: 3, loads: 3, nav: 2, views: 5, single: 0 },
        { key: '/maps', page: { id: 2, title: 'Maps' }, entries: 0, unique: 1, loads: 1, nav: 5, views: 6, single: 0 },
        { key: '/removed', entries: 1, unique: 1, loads: 1, nav: 0, views: 1, single: 1 },
    ],
    transitions: [
        { from: { path: '/', page: { id: 1, title: 'Home' } }, to: { path: '/maps', page: { id: 2, title: 'Maps' } }, count: 2 },
        { from: { path: '/maps', page: { id: 2, title: 'Maps' } }, to: { path: '/gone' }, count: 1 },
    ],
    hours: [{ weekday: 6, hour: 18, count: 4 }],
    languages: [
        { key: 'pl', count: 3 },
        { key: null, count: 1 },
    ],
    referrers: [
        { key: null, count: 3 },
        { key: 'google.com', count: 1 },
    ],
    devices: [
        { key: 'mobile', count: 3 },
        { key: 'desktop', count: 1 },
    ],
    ...overrides,
});

/** The pages card of the pages subpage. */
function pagesCard(root: HTMLElement): HTMLElement {
    return [...root.querySelectorAll<HTMLElement>('.card')].find(
        (card) => card.querySelector('.card__title')?.textContent === 'Pages',
    )!;
}

/** Name, path, count and share of each listed page. */
function pageRows(card: HTMLElement): string[][] {
    return [...card.querySelectorAll('tbody tr')].map((tr) => [
        tr.querySelector('a')?.textContent?.trim() ??
            [...tr.querySelector('.stats-table__name')!.childNodes]
                .find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!
                .textContent!.trim(),
        tr.querySelector('.stats-table__path')!.textContent!,
        tr.querySelector('td')!.textContent!,
        tr.querySelector('.stats-table__share')!.textContent!,
    ]);
}

async function render(
    stats: VisitStats | null,
    query: Record<string, string> = {},
    section: AnalyticsSection = 'overview',
) {
    TestBed.configureTestingModule({
        imports: [AnalyticsComponent],
        providers: [provideNoopAnimations(), provideRouter([])],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.componentRef.setInput('stats', stats);
    fixture.componentRef.setInput('section', section);
    Object.entries(query).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
    fixture.detectChanges();
    await fixture.whenStable();
    // ngModel hands the value to the radio group a tick later
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const text = (selector: string) => [...root.querySelectorAll(selector)].map((e) => e.textContent?.trim());
    const radios = () => [...root.querySelectorAll<HTMLInputElement>('.analytics__controls input[type="radio"]')];
    const checked = () =>
        [...root.querySelectorAll('.analytics__controls mat-radio-button')].map((r) =>
            r.classList.contains('mat-mdc-radio-checked'),
        );
    const settle = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
    };
    return { fixture, root, text, radios, checked, navigate, settle };
}

describe('AnalyticsComponent', () => {
    it('has tabs to the three subpages, keeping the period of the URL', async () => {
        const { root } = await render(makeStats(), {}, 'pages');
        const tabs = [...root.querySelectorAll<HTMLAnchorElement>('.analytics__tabs a')];
        expect(tabs.map((a) => [a.textContent?.trim(), a.getAttribute('href'), a.getAttribute('aria-selected')])).toEqual([
            ['Overview', '/analytics', 'false'],
            ['Pages', '/analytics/pages', 'true'],
            ['Visitors', '/analytics/visitors', 'false'],
        ]);
        // each subpage shows its own cards only
        expect([...root.querySelectorAll('.card__title')].map((t) => t.textContent)).toEqual(['Pages', 'Moves between pages']);
        expect(root.querySelector('.kpis')).toBeNull();
    });

    it('shows the totals, the days and the hours on the overview', async () => {
        const { root } = await render(makeStats());
        expect([...root.querySelectorAll('.card__title')].map((t) => t.textContent)).toEqual(['Day by day', 'Visiting hours']);
        expect(root.querySelector('.kpis')).not.toBeNull();
    });

    it('shows the period, the totals and pages per entry', async () => {
        const { text, root } = await render(makeStats());
        expect(root.querySelector('.analytics__period')?.textContent).toMatch(/^November 1\s*–\s*3, 2026$/);
        expect(text('.kpi__label')).toEqual([
            'Entries',
            'Unique visitors',
            'Page loads',
            'In-site transitions',
            'Pages per entry',
            'Single-page visits',
        ]);
        expect(text('.kpi__value')).toEqual(['4', '3', '5', '7', '3.0', '25%']);
    });

    it('compares the tiles with the previous period of the same length', async () => {
        const { root, text } = await render(makeStats());
        // entries 5 -> 4, unique 3 -> 3, loads 4 -> 5, transitions 6 -> 7, pages per entry 2.0 -> 3.0,
        // single-page 60% -> 25%
        expect(text('.kpi__delta').map((t) => t?.replace(/\s+/g, ' '))).toEqual([
            '−20% against the previous period',
            '0% against the previous period',
            '+25% against the previous period',
            '+17% against the previous period',
            '+50% against the previous period',
            '−35 pp against the previous period',
        ]);
        expect([...root.querySelectorAll('.kpi__delta')].map((d) => d.className)).toEqual([
            'kpi__delta kpi__delta--down',
            'kpi__delta kpi__delta--same',
            'kpi__delta kpi__delta--up',
            'kpi__delta kpi__delta--up',
            'kpi__delta kpi__delta--up',
            'kpi__delta kpi__delta--down',
        ]);
        expect(root.querySelector('.analytics__compare')?.textContent).toMatch(/^Changes against October 29\s*–\s*31, 2026\.$/);
    });

    it('shows no change when the previous period had no visits', async () => {
        const previous = {
            from: '2026-10-29',
            to: '2026-10-31',
            totals: { entries: 0, unique: 0, loads: 0, nav: 0 },
            singlePage: { visits: 0, single: 0 },
        };
        const { root } = await render(makeStats({ previous }));
        expect(root.querySelector('.kpi__delta')).toBeNull();
        expect(root.querySelector('.analytics__compare')).toBeNull();
    });

    it('lists the pages by entries, with links to the CMS pages and their shares', async () => {
        const { root } = await render(makeStats(), {}, 'pages');
        const card = pagesCard(root);
        expect(card.querySelector('.card__title')?.textContent).toBe('Pages');
        expect(card.querySelector('.card__desc')?.textContent).toBe('Pages visits started on; share of all entries, and of the visits that also ended there.');
        // a page without entries is left out
        expect(pageRows(card)).toEqual([
            ['Home', '/', '3', '75.0%'],
            ['/removed', '/removed', '1', '25.0%'],
        ]);
        expect(card.querySelector('tbody a')?.getAttribute('href')).toBe('/pages/edit/1');
        expect(card.querySelectorAll('tbody tr')[1].querySelector('a')).toBeNull();
        expect(card.querySelector('.share__bar')?.classList).toContain('series-entries');
        // entries also show which share of the visits stayed on the page
        expect([...card.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
            'Page',
            'Count',
            'Share',
            'Single-page',
        ]);
        expect([...card.querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('td')[2]?.textContent)).toEqual([
            '0%',
            '100%',
        ]);
    });

    it('lists the pages by any metric of the chart', async () => {
        const { root, settle } = await render(makeStats(), {}, 'pages');
        const card = pagesCard(root);
        const metrics = () => [...card.querySelectorAll<HTMLInputElement>('.segmented input[type="radio"]')];
        expect([...card.querySelectorAll('.segmented__option')].map((o) => o.textContent?.trim())).toEqual([
            'Entries',
            'Unique',
            'Page loads',
            'Transitions',
            'Page views',
        ]);

        metrics()[3].click();
        await settle();
        expect(card.querySelectorAll('thead th').length).toBe(3);
        expect(pageRows(card)).toEqual([
            ['Maps', '/maps', '5', '71.4%'],
            ['Home', '/', '2', '28.6%'],
        ]);
        expect(card.querySelector('.card__desc')?.textContent).toContain('share of all transitions');

        metrics()[4].click();
        await settle();
        expect(pageRows(card).map((r) => [r[0], r[2], r[3]])).toEqual([
            ['Maps', '6', '50.0%'],
            ['Home', '5', '41.7%'],
            ['/removed', '1', '8.3%'],
        ]);

        // unique visitors: the share of the site's daily visitors who opened the page
        metrics()[1].click();
        await settle();
        expect(pageRows(card).map((r) => [r[0], r[2], r[3]])).toEqual([
            ['Home', '3', '100.0%'],
            ['Maps', '1', '33.3%'],
            ['/removed', '1', '33.3%'],
        ]);
    });

    it('remembers the metric of the pages', async () => {
        const { root, settle } = await render(makeStats(), {}, 'pages');
        pagesCard(root).querySelectorAll<HTMLInputElement>('.segmented input[type="radio"]')[3].click();
        await settle();
        expect(stored()).toMatchObject({ pageMetric: 'nav' });

        TestBed.resetTestingModule();
        const again = await render(makeStats(), {}, 'pages');
        expect(pageRows(pagesCard(again.root))[0]).toEqual(['Maps', '/maps', '5', '71.4%']);
    });

    it('shows ten pages until the list is unfolded', async () => {
        const pages = Array.from({ length: 12 }, (_, i) => ({
            key: `/p${String(i).padStart(2, '0')}`,
            entries: 12 - i,
            unique: 1,
            loads: 1,
            nav: 0,
            views: 1,
            single: 0,
        }));
        const { root, settle } = await render(makeStats({ pages }), {}, 'pages');
        const card = pagesCard(root);
        const toggle = () => card.querySelector<HTMLButtonElement>('.card__action')!;
        expect(card.querySelector('.badge')?.textContent).toContain('12');
        expect(card.querySelectorAll('tbody tr').length).toBe(10);
        expect(toggle().textContent?.trim()).toBe('Show all 12 pages');

        toggle().click();
        await settle();
        expect(card.querySelectorAll('tbody tr').length).toBe(12);
        expect(toggle().textContent?.trim()).toBe('Show less');
        expect(toggle().getAttribute('aria-expanded')).toBe('true');
    });

    it('lists the sources, devices and languages of the entries with translated labels', async () => {
        const { root } = await render(makeStats(), {}, 'visitors');
        const cards = [...root.querySelectorAll('.analytics__tables > .card')];
        expect(cards.map((c) => c.querySelector('.card__title')?.textContent?.trim())).toEqual([
            'Sources of entries',
            'Devices',
            'Languages',
        ]);
        expect([...cards[2].querySelectorAll('tbody th')].map((th) => th.textContent?.trim())).toEqual([
            'Polish',
            'Unknown',
        ]);
        expect(cards[0].querySelector('tbody th')?.textContent?.trim()).toBe('Direct or unknown');
        expect(cards[0].querySelector('.stats-table__share')?.textContent).toBe('75.0%');
        expect([...cards[1].querySelectorAll('tbody th')].map((th) => th.textContent?.trim())).toEqual([
            'Phone',
            'Desktop',
        ]);
    });

    it('lists the moves between pages, linking the CMS pages', async () => {
        const { root } = await render(makeStats(), {}, 'pages');
        const card = [...root.querySelectorAll<HTMLElement>('.card')].find(
            (c) => c.querySelector('.card__title')?.textContent === 'Moves between pages',
        )!;
        const rows = [...card.querySelectorAll('tbody tr')];
        expect(rows.map((tr) => [...tr.querySelectorAll('.stats-table__move > a, .stats-table__move > .stats-table__path')].map((e) => e.textContent))).toEqual([
            ['Home', 'Maps'],
            ['Maps', '/gone'],
        ]);
        expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/pages/edit/1');
        expect(rows.map((tr) => tr.querySelector('td')?.textContent)).toEqual(['2', '1']);
    });

    it('draws the device split of the entries as a ring', async () => {
        const { root } = await render(makeStats(), {}, 'visitors');
        const devices = root.querySelectorAll('.analytics__tables > .card')[1];
        const segments = [...devices.querySelectorAll<SVGCircleElement>('.donut__segment')];
        expect(segments.map((s) => s.getAttribute('class'))).toEqual([
            'donut__segment series-mobile',
            'donut__segment series-desktop',
        ]);
        // 3 of 4 entries, then 1 of 4, with 2 units between them
        const ring = 2 * Math.PI * 40;
        const lengths = segments.map((s) => parseFloat(s.getAttribute('stroke-dasharray')!));
        expect(lengths[0]).toBeCloseTo(ring * 0.75 - 2);
        expect(lengths[1]).toBeCloseTo(ring * 0.25 - 2);
        expect(parseFloat(segments[1].getAttribute('stroke-dashoffset')!)).toBeCloseTo(-ring * 0.75);
        expect(devices.querySelector('.donut__value')?.textContent).toBe('4');
        expect(devices.querySelector('.donut__label')?.textContent).toBe('entries');
        // the table is its legend
        expect([...devices.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('class'))).toEqual([
            'series-mobile',
            'series-desktop',
        ]);
        expect(devices.querySelectorAll('.stats-table__key').length).toBe(2);
    });

    it('lists the days newest first in the daily table', async () => {
        const { root } = await render(makeStats());
        const rows = [...root.querySelectorAll('.stats-details tbody tr')];
        expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual([
            'Tue, Nov 3, 2026',
            'Mon, Nov 2, 2026',
            'Sun, Nov 1, 2026',
        ]);
        // entries, unique, loads, transitions, page views
        expect([...rows[2].querySelectorAll('td')].map((td) => td.textContent)).toEqual(['3', '2', '4', '6', '10']);
    });

    it('says when the period has no visits', async () => {
        const totals = { entries: 0, unique: 0, loads: 0, nav: 0 };
        const { root } = await render(makeStats({ totals, pages: [], referrers: [], devices: [], languages: [], transitions: [], hours: [] }));
        expect(root.querySelector('.empty__title')?.textContent).toBe('No visits in this period');
        expect(root.querySelector('.kpis')).toBeNull();
    });

    it('says when the statistics could not be loaded, keeping the period switch', async () => {
        const { root, radios } = await render(null);
        expect(root.querySelector('.empty__title')?.textContent).toBe('The statistics could not be loaded');
        expect(radios().length).toBe(4);
    });

    it('marks the remembered preset and opens another without a query', async () => {
        localStorage.setItem(PREFS, JSON.stringify({ days: 7 }));
        const { radios, checked, navigate, settle } = await render(makeStats());
        expect(checked()).toEqual([true, false, false, false]);
        radios()[2].click();
        await settle();
        // the URL loses its query (a period of one's own) and is reloaded
        expect(navigate).toHaveBeenCalledWith([], { queryParams: {}, onSameUrlNavigation: 'reload' });
        // remembered for the next visit
        expect(stored()).toMatchObject({ days: 90 });
    });

    it('opens a period of its own, starting from the shown one', async () => {
        const { root, radios, checked, navigate, settle } = await render(makeStats());
        expect(checked()).toEqual([false, true, false, false]);
        expect(root.querySelector('.analytics__custom')).toBeNull();
        radios()[3].click();
        await settle();
        expect(navigate).not.toHaveBeenCalled();
        const form = root.querySelector<HTMLFormElement>('.analytics__custom')!;
        expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
        form.dispatchEvent(new Event('submit'));
        await settle();
        expect(navigate).toHaveBeenCalledWith([], { queryParams: { from: '2026-11-01', to: '2026-11-03' } });
        // a period of one's own is not remembered
        expect(stored().days).toBeUndefined();
    });

    it('marks a period of its own from the URL', async () => {
        const { checked, root } = await render(makeStats(), { from: '2026-11-01', to: '2026-11-03' });
        expect(checked()).toEqual([false, false, false, true]);
        expect(root.querySelector('.analytics__custom')).not.toBeNull();
    });
});
