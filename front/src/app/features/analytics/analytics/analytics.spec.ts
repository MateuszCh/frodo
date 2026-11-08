import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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
        { day: '2026-11-01', visitors: 2, visits: 3, views: 10 },
        { day: '2026-11-02', visitors: 0, visits: 0, views: 0 },
        { day: '2026-11-03', visitors: 1, visits: 1, views: 2 },
    ],
    totals: { visitors: 3, visits: 4, views: 12, duration: 85, engagement: 64 },
    singlePage: { visits: 4, single: 1 },
    previous: {
        from: '2026-10-29',
        to: '2026-10-31',
        totals: { visitors: 3, visits: 5, views: 10, duration: 50, engagement: null },
        singlePage: { visits: 5, single: 3 },
    },
    pages: [
        { key: '/', page: { id: 1, title: 'Home' }, views: 5, visitors: 3, entries: 3, single: 0, exits: 1, engagement: 42 },
        { key: '/maps', page: { id: 2, title: 'Maps' }, views: 6, visitors: 1, entries: 0, single: 0, exits: 2, engagement: null },
        { key: '/removed', views: 1, visitors: 1, entries: 1, single: 1, exits: 1, engagement: 5 },
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
    browsers: [
        { key: 'chrome', count: 3 },
        { key: null, count: 1 },
    ],
    systems: [
        { key: 'android', count: 2 },
        { key: 'ios', count: 2 },
    ],
    depth: [
        { key: '1', count: 1 },
        { key: '2', count: 2 },
        { key: '3-5', count: 1 },
        { key: '6+', count: 0 },
    ],
    lengths: [
        { key: '0-10', count: 2 },
        { key: '10-30', count: 0 },
        { key: '30-180', count: 1 },
        { key: '180+', count: 1 },
    ],
    notFound: [{ key: '/old-map', count: 3, sources: [{ key: '/maps', count: 2 }, { key: null, count: 1 }] }],
    outbound: [{ key: 'pgi.gov.pl/mapy', count: 2 }],
    downloads: [],
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
        providers: [provideNoopAnimations(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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
        expect([...root.querySelectorAll('.card__title')].map((t) => t.textContent)).toEqual([
            'Pages',
            'Moves between pages',
            '404 pages',
            'Outbound links',
            'Downloaded files',
        ]);
        expect(root.querySelector('.kpis')).toBeNull();
    });

    it('shows the totals, the days and the hours on the overview', async () => {
        const { root } = await render(makeStats());
        expect([...root.querySelectorAll('.card__title')].map((t) => t.textContent)).toEqual([
            'Day by day',
            'Engagement',
            'Visiting hours',
        ]);
        expect(root.querySelector('.kpis')).not.toBeNull();
    });

    it('shows the period, the totals, views per visit and the average visit', async () => {
        const { text, root } = await render(makeStats());
        expect(root.querySelector('.analytics__period')?.textContent).toMatch(/^November 1\s*–\s*3, 2026$/);
        expect(text('.kpi__label')).toEqual([
            'Visitors',
            'Visits',
            'Page views',
            'Views per visit',
            'Average visit',
            'Single-page visits',
        ]);
        expect(text('.kpi__value')).toEqual(['3', '4', '12', '3.0', '1m 25s', '25%']);
    });

    it('compares the tiles with the previous period of the same length', async () => {
        const { root, text } = await render(makeStats());
        // visitors 3 -> 3, visits 5 -> 4, views 10 -> 12, views per visit 2.0 -> 3.0,
        // average visit 50 s -> 85 s, single-page 60% -> 25%
        expect(text('.kpi__delta').map((t) => t?.replace(/\s+/g, ' '))).toEqual([
            '0% against the previous period',
            '−20% against the previous period',
            '+20% against the previous period',
            '+50% against the previous period',
            '+70% against the previous period',
            '−35 pp against the previous period',
        ]);
        expect([...root.querySelectorAll('.kpi__delta')].map((d) => d.className)).toEqual([
            'kpi__delta kpi__delta--same',
            'kpi__delta kpi__delta--down',
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
            totals: { visitors: 0, visits: 0, views: 0, duration: 0, engagement: null },
            singlePage: { visits: 0, single: 0 },
        };
        const { root } = await render(makeStats({ previous }));
        expect(root.querySelector('.kpi__delta')).toBeNull();
        expect(root.querySelector('.analytics__compare')).toBeNull();
    });

    it('explains each metric of the chart: a tooltip on hover, and the description of the option', async () => {
        const { root } = await render(makeStats());
        const options = [...root.querySelectorAll<HTMLElement>('.chart-toolbar__metrics .segmented__option')];
        expect(options.every((o) => o.classList.contains('mat-mdc-tooltip-trigger'))).toBe(true);
        const hints = options.map((o) => {
            const id = o.querySelector('input')!.getAttribute('aria-describedby')!;
            return root.querySelector(`[id="${id}"]`)?.textContent;
        });
        expect(hints[1]).toContain('no break longer than 30 minutes');
        expect(hints[0]).toContain('Different people on a day');
        expect(hints[2]).toContain('Every page opened');
    });

    it('lists the pages by page views, with links to the CMS pages and their shares', async () => {
        const { root } = await render(makeStats(), {}, 'pages');
        const card = pagesCard(root);
        expect(card.querySelector('.card__title')?.textContent).toBe('Pages');
        expect(card.querySelector('.card__desc')?.textContent).toBe('Every opening of the pages; share of all page views.');
        expect(pageRows(card)).toEqual([
            ['Maps', '/maps', '6', '50.0%'],
            ['Home', '/', '5', '41.7%'],
            ['/removed', '/removed', '1', '8.3%'],
        ]);
        expect(card.querySelector('tbody a')?.getAttribute('href')).toBe('/pages/edit/2');
        expect(card.querySelectorAll('tbody tr')[2].querySelector('a')).toBeNull();
        expect(card.querySelector('.share__bar')?.classList).toContain('series-views');
        // views also show how long each page was visible
        expect([...card.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Page', 'Count', 'Share', 'Avg. time']);
        expect([...card.querySelectorAll('tbody tr')].map((tr) => tr.querySelectorAll('td')[2]?.textContent)).toEqual([
            '–',
            '42s',
            '5s',
        ]);
    });

    it('lists the pages by visitors or by the visits that started on them', async () => {
        const { root, settle } = await render(makeStats(), {}, 'pages');
        const card = pagesCard(root);
        const metrics = () => [...card.querySelectorAll<HTMLInputElement>('.segmented input[type="radio"]')];
        expect([...card.querySelectorAll('.segmented__option')].map((o) => o.textContent?.trim())).toEqual([
            'Page views',
            'Visitors',
            'Entries',
            'Exits',
        ]);
        // each with what it means
        const entriesHint = metrics()[2].getAttribute('aria-describedby')!;
        expect(card.querySelector(`[id="${entriesHint}"]`)?.textContent).toContain('Visits that started on this page');
        expect(card.querySelectorAll('.segmented__option.mat-mdc-tooltip-trigger').length).toBe(4);

        metrics()[2].click();
        await settle();
        expect(card.querySelector('.card__desc')?.textContent).toBe(
            'Visits that started on the page; share of all visits, and of those that also ended there.',
        );
        // a page no visit started on is left out
        expect(pageRows(card)).toEqual([
            ['Home', '/', '3', '75.0%'],
            ['/removed', '/removed', '1', '25.0%'],
        ]);
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

        // visitors: the share of the site's daily visitors who opened the page
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
        pagesCard(root).querySelectorAll<HTMLInputElement>('.segmented input[type="radio"]')[2].click();
        await settle();
        expect(stored()).toMatchObject({ pageMetric: 'entries' });

        TestBed.resetTestingModule();
        const again = await render(makeStats(), {}, 'pages');
        expect(pageRows(pagesCard(again.root))[0]).toEqual(['Home', '/', '3', '75.0%']);
    });

    it('shows ten pages until the list is unfolded', async () => {
        const pages = Array.from({ length: 12 }, (_, i) => ({
            key: `/p${String(i).padStart(2, '0')}`,
            views: 12 - i,
            visitors: 1,
            entries: 0,
            single: 0,
            exits: 0,
            engagement: null,
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

    it('lists the sources, devices and languages of the visits with translated labels', async () => {
        const { root } = await render(makeStats(), {}, 'visitors');
        const cards = [...root.querySelectorAll('.analytics__tables > .card')];
        expect(cards.map((c) => c.querySelector('.card__title')?.textContent?.trim())).toEqual([
            'Sources of visits',
            'Devices',
            'Languages',
            'Browsers',
            'Systems',
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

    it('draws the device split of the visits as a ring', async () => {
        const { root } = await render(makeStats(), {}, 'visitors');
        const devices = root.querySelectorAll('.analytics__tables > .card')[1];
        const segments = [...devices.querySelectorAll<SVGCircleElement>('.donut__segment')];
        expect(segments.map((s) => s.getAttribute('class'))).toEqual([
            'donut__segment series-mobile',
            'donut__segment series-desktop',
        ]);
        // 3 of 4 visits, then 1 of 4, with 2 units between them
        const ring = 2 * Math.PI * 40;
        const lengths = segments.map((s) => parseFloat(s.getAttribute('stroke-dasharray')!));
        expect(lengths[0]).toBeCloseTo(ring * 0.75 - 2);
        expect(lengths[1]).toBeCloseTo(ring * 0.25 - 2);
        expect(parseFloat(segments[1].getAttribute('stroke-dashoffset')!)).toBeCloseTo(-ring * 0.75);
        expect(devices.querySelector('.donut__value')?.textContent).toBe('4');
        expect(devices.querySelector('.donut__label')?.textContent).toBe('visits');
        // the table is its legend
        expect([...devices.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('class'))).toEqual([
            'series-mobile',
            'series-desktop',
        ]);
        expect(devices.querySelectorAll('.stats-table__key').length).toBe(2);
    });

    it('draws sources and languages as rings, coloured in the order of the list', async () => {
        const { root } = await render(makeStats(), {}, 'visitors');
        const [referrers, , languages] = root.querySelectorAll('.analytics__tables > .card');
        for (const card of [referrers, languages]) {
            expect([...card.querySelectorAll('.donut__segment')].map((s) => s.getAttribute('class'))).toEqual([
                'donut__segment series-slot-1',
                'donut__segment series-slot-2',
            ]);
            expect([...card.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('class'))).toEqual([
                'series-slot-1',
                'series-slot-2',
            ]);
        }
    });

    it('folds what does not get a colour of its own into one grey arc', async () => {
        const referrers = ['a.pl', 'b.pl', 'c.pl', 'd.pl', 'e.pl', 'f.pl'].map((key) => ({ key, count: 1 }));
        // 8 visits: the six listed hosts and two the top list leaves out
        const totals = { visitors: 8, visits: 8, views: 8, duration: 0, engagement: null };
        const { root } = await render(makeStats({ totals, referrers }), {}, 'visitors');
        const card = root.querySelectorAll('.analytics__tables > .card')[0];
        expect([...card.querySelectorAll('.donut__segment')].map((s) => s.getAttribute('class'))).toEqual([
            'donut__segment series-slot-1',
            'donut__segment series-slot-2',
            'donut__segment series-slot-3',
            'donut__segment series-slot-4',
            'donut__segment series-other',
        ]);
        expect([...card.querySelectorAll('tbody tr')].map((tr) => tr.getAttribute('class'))).toEqual([
            'series-slot-1',
            'series-slot-2',
            'series-slot-3',
            'series-slot-4',
            'series-other',
            'series-other',
        ]);
        expect(card.querySelector('.donut__value')?.textContent).toBe('8');
    });

    it('points at the arc of a hovered table row', async () => {
        const { root, fixture } = await render(makeStats(), {}, 'visitors');
        const card = root.querySelectorAll('.analytics__tables > .card')[1];
        card.querySelectorAll('tbody tr')[1].dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(card.querySelector('.donut__tip-name')?.textContent?.trim()).toBe('Desktop');
        expect(card.querySelectorAll('tbody tr')[1].classList).toContain('stats-table__row--active');
        // the other cards stay as they were
        expect(root.querySelectorAll('.donut__tip').length).toBe(1);

        card.querySelector('table')!.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();
        await fixture.whenStable();
        expect(root.querySelector('.donut__tip')).toBeNull();
    });

    it('shows a one-day period by the hour, without the weekly heat map', async () => {
        const hourly = [
            { hour: 0, visitors: 0, visits: 0, views: 0 },
            { hour: 1, visitors: 2, visits: 2, views: 5 },
        ];
        const { root } = await render(makeStats({ from: '2026-11-08', to: '2026-11-08', hourly }));
        expect([...root.querySelectorAll('.card__title')].map((t) => t.textContent)).toEqual(['Hour by hour', 'Engagement']);
        expect(root.querySelectorAll('.chart__hit').length).toBe(2);
        expect(root.querySelector('.stats-details__summary')?.textContent?.trim()).toBe('Hourly table');
        const rows = [...root.querySelectorAll('.stats-details tbody tr')];
        expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual(['00:00–01:00', '01:00–02:00']);
        expect([...rows[1].querySelectorAll('td')].map((td) => td.textContent)).toEqual(['2', '2', '5']);
    });

    it('shows a long period by the month, with a switch to weeks and days that is remembered', async () => {
        const start = Date.parse('2026-01-01T00:00:00Z');
        const days = Array.from({ length: 312 }, (_, i) => ({
            day: new Date(start + i * 86400000).toISOString().slice(0, 10),
            visitors: 1,
            visits: 1,
            views: 2,
        }));
        const { root, settle } = await render(makeStats({ from: '2026-01-01', to: '2026-11-08', days }));
        const units = () => [...root.querySelectorAll<HTMLInputElement>('.chart-toolbar__unit input[type="radio"]')];
        expect([...root.querySelectorAll('.chart-toolbar__unit .segmented__option')].map((o) => o.textContent?.trim())).toEqual([
            'Days',
            'Weeks',
            'Months',
        ]);
        expect(root.querySelector('.card__title')?.textContent).toBe('Month by month');
        expect(root.querySelectorAll('.chart__hit').length).toBe(11);
        // every month is labelled
        expect(root.querySelectorAll('.chart__label').length).toBe(11);
        expect(root.querySelector('.stats-details__summary')?.textContent?.trim()).toBe('Monthly table');
        // newest first; November so far is marked
        expect(root.querySelector('.stats-details tbody th')?.textContent?.replace(/\s/g, ' ')).toBe(
            'November 2026 (Nov 1 – 8, partial)',
        );

        units()[1].click();
        await settle();
        expect(root.querySelector('.card__title')?.textContent).toBe('Week by week');
        // 29 December 2025 (the week of 1 January) to Sunday 8 November: 45 weeks
        expect(root.querySelectorAll('.chart__hit').length).toBe(45);
        expect(stored()).toMatchObject({ chartUnit: 'week' });
    });

    it('has no unit switch for a month or less', async () => {
        const { root } = await render(makeStats());
        expect(root.querySelector('.chart-toolbar__unit')).toBeNull();
        expect(root.querySelector('.card__title')?.textContent).toBe('Day by day');
    });

    it('shows visits per visitor, the time on a page and the visits by depth and length', async () => {
        const { root } = await render(makeStats());
        const card = [...root.querySelectorAll<HTMLElement>('.card')].find(
            (c) => c.querySelector('.card__title')?.textContent === 'Engagement',
        )!;
        expect([...card.querySelectorAll('.engagement__value')].map((v) => v.textContent)).toEqual(['1.33', '1m 4s']);
        const splits = [...card.querySelectorAll('.engagement__split')];
        expect(splits.map((t) => t.querySelector('.engagement__title')?.textContent)).toEqual(['Visit depth', 'Visit length']);
        expect(
            [...splits[0].querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((cell) => cell.textContent?.trim())),
        ).toEqual([
            ['1 page', '1', '25.0%'],
            ['2 pages', '2', '50.0%'],
            ['3–5 pages', '1', '25.0%'],
            ['6 pages or more', '0', '0.0%'],
        ]);
        expect(splits[1].querySelector('tbody th')?.textContent?.trim()).toBe('up to 10 s');
    });

    it('says the time on a page is collected from the new site on, before it has any', async () => {
        const totals = { visitors: 3, visits: 4, views: 12, duration: 85, engagement: null };
        const { root } = await render(makeStats({ totals }));
        const stat = root.querySelectorAll('.engagement__stat')[1];
        expect(stat.querySelector('.engagement__value')?.textContent).toBe('–');
        expect(stat.querySelector('.engagement__hint')?.textContent).toBe('Collected since the new version of the site');
    });

    it('shows who is on the site now under the period', async () => {
        const { root, fixture } = await render(makeStats());
        TestBed.inject(HttpTestingController)
            .expectOne('/api/analytics/live')
            .flush({ minutes: 5, visitors: 2, pages: [{ key: '/', count: 2, page: { id: 1, title: 'Home' } }] });
        fixture.detectChanges();
        const live = root.querySelector('.live')!;
        expect(live.textContent?.trim()).toBe('2 people on the site now');
        expect(live.classList).toContain('live--on');
    });

    it('lists the addresses that do not exist, the outbound links and the downloads', async () => {
        const { root } = await render(makeStats(), {}, 'pages');
        const card = (title: string) =>
            [...root.querySelectorAll<HTMLElement>('.card')].find((c) => c.querySelector('.card__title')?.textContent === title)!;
        expect(
            [...card('404 pages').querySelectorAll('.stats-table__path')].map((p) => p.textContent),
        ).toEqual(['/old-map', 'from: /maps, typed in or unknown']);
        expect(card('404 pages').querySelector('td')?.textContent).toBe('3');
        const link = card('Outbound links').querySelector('a')!;
        expect([link.textContent, link.getAttribute('href'), link.getAttribute('rel')]).toEqual([
            'pgi.gov.pl/mapy',
            'https://pgi.gov.pl/mapy',
            'noopener noreferrer',
        ]);
        expect(card('Downloaded files').querySelector('.analytics__none')?.textContent).toBe('No data in this period.');
    });

    it('draws the browsers and systems of the visits as rings', async () => {
        const { root } = await render(makeStats(), {}, 'visitors');
        const cards = [...root.querySelectorAll('.analytics__tables > .card')];
        expect(cards.slice(3).map((c) => c.querySelector('.card__title')?.textContent?.trim())).toEqual([
            'Browsers',
            'Systems',
        ]);
        const rows = (card: Element) => [...card.querySelectorAll('tbody th')].map((th) => th.textContent?.trim());
        expect(rows(cards[3])).toEqual(['Chrome', 'Unknown']);
        expect(rows(cards[4])).toEqual(['Android', 'iOS']);
        expect(cards[4].querySelectorAll('.donut__segment').length).toBe(2);
    });

    it('lists the days newest first in the daily table', async () => {
        const { root } = await render(makeStats());
        const rows = [...root.querySelectorAll('.stats-details tbody tr')];
        expect(rows.map((r) => r.querySelector('th')?.textContent)).toEqual([
            'Tue, Nov 3, 2026',
            'Mon, Nov 2, 2026',
            'Sun, Nov 1, 2026',
        ]);
        // visitors, visits, page views
        expect([...rows[2].querySelectorAll('td')].map((td) => td.textContent)).toEqual(['2', '3', '10']);
    });

    it('says when the period has no visits', async () => {
        const totals = { visitors: 0, visits: 0, views: 0, duration: 0, engagement: null };
        const { root } = await render(makeStats({ totals, pages: [], referrers: [], devices: [], languages: [], transitions: [], hours: [] }));
        expect(root.querySelector('.empty__title')?.textContent).toBe('No visits in this period');
        expect(root.querySelector('.kpis')).toBeNull();
    });

    it('says when the statistics could not be loaded, keeping the period switch', async () => {
        const { root, radios } = await render(null);
        expect(root.querySelector('.empty__title')?.textContent).toBe('The statistics could not be loaded');
        expect(radios().length).toBe(6);
    });

    it('offers today, 7, 30 and 90 days, the year to date and a period of its own', async () => {
        const { root } = await render(makeStats());
        expect(
            [...root.querySelectorAll('.analytics__controls mat-radio-button')].map((r) => r.textContent?.trim()),
        ).toEqual(['Today', '7 days', '30 days', '90 days', 'Year to date', 'Custom']);
    });

    it('marks the remembered preset and opens another without a query', async () => {
        localStorage.setItem(PREFS, JSON.stringify({ period: '7' }));
        const { radios, checked, navigate, settle } = await render(makeStats());
        expect(checked()).toEqual([false, true, false, false, false, false]);
        radios()[4].click();
        await settle();
        // the URL loses its query (a period of one's own) and is reloaded
        expect(navigate).toHaveBeenCalledWith([], { queryParams: {}, onSameUrlNavigation: 'reload' });
        // remembered for the next visit
        expect(stored()).toMatchObject({ period: 'ytd' });
        expect(checked()).toEqual([false, false, false, false, true, false]);
    });

    it('opens a period of its own, starting from the shown one', async () => {
        const { root, radios, checked, navigate, settle } = await render(makeStats());
        expect(checked()).toEqual([false, false, true, false, false, false]);
        expect(root.querySelector('.analytics__custom')).toBeNull();
        radios()[5].click();
        await settle();
        expect(navigate).not.toHaveBeenCalled();
        const form = root.querySelector<HTMLFormElement>('.analytics__custom')!;
        expect(form.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
        form.dispatchEvent(new Event('submit'));
        await settle();
        expect(navigate).toHaveBeenCalledWith([], { queryParams: { from: '2026-11-01', to: '2026-11-03' } });
        // a period of one's own is not remembered
        expect(stored().period).toBeUndefined();
    });

    it('marks a period of its own from the URL', async () => {
        const { checked, root } = await render(makeStats(), { from: '2026-11-01', to: '2026-11-03' });
        expect(checked()).toEqual([false, false, false, false, false, true]);
        expect(root.querySelector('.analytics__custom')).not.toBeNull();
    });
});
