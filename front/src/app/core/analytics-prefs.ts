/**
 * What the Analytics tab remembers between visits (localStorage, one key): the preset
 * period, the kind of the daily chart with its metric and lines, and the metric the pages
 * are listed by. A value that is missing, unknown or unreadable falls back to the default;
 * blocked storage only means nothing is remembered.
 */

/**
 * The metrics of the daily chart, as GA4 and Plausible count them: visitors (per day),
 * visits (no 30-minute gap) and page views. The order fixes each one's colour (--series-<metric>).
 */
export const VISIT_METRICS = ['visitors', 'visits', 'views'] as const;
export type VisitMetric = (typeof VISIT_METRICS)[number];
/**
 * What the pages are listed by: views, visitors, entries (the visits that started on a
 * page) and exits (those that ended on it).
 */
export const PAGE_METRICS = ['views', 'visitors', 'entries', 'exits'] as const;
export type PageMetric = (typeof PAGE_METRICS)[number];
/** The units a long period can be shown in (features/analytics/visit-groups.ts). */
export const CHART_UNITS = ['day', 'week', 'month'] as const;
export type ChartUnit = (typeof CHART_UNITS)[number];
export const CHART_KINDS = ['bar', 'line'] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

/** The preset periods, as the server takes them: today, the last 7, 30 or 90 days, the year to date. */
export const VISIT_PRESETS = ['today', '7', '30', '90', 'ytd'] as const;
export type VisitPreset = (typeof VISIT_PRESETS)[number];
export const DEFAULT_VISIT_PRESET: VisitPreset = '30';

export interface AnalyticsPrefs {
    period: VisitPreset;
    chartKind: ChartKind;
    /** the unit picked for long periods; null: each period's own default */
    chartUnit: ChartUnit | null;
    chartMetric: VisitMetric;
    /** never empty */
    chartLines: VisitMetric[];
    pageMetric: PageMetric;
}

const KEY = 'frodo.analytics';

export const DEFAULT_ANALYTICS_PREFS: AnalyticsPrefs = {
    period: DEFAULT_VISIT_PRESET,
    chartKind: 'bar',
    chartUnit: null,
    chartMetric: 'visitors',
    chartLines: ['visitors'],
    pageMetric: 'views',
};

function isPreset(value: unknown): value is VisitPreset {
    return (VISIT_PRESETS as readonly unknown[]).includes(value);
}

/** The remembered preset; before "today" and "year to date" it was a number of days. */
function storedPreset(stored: Partial<Record<keyof AnalyticsPrefs | 'days', unknown>>): VisitPreset {
    if (isPreset(stored.period)) return stored.period;
    const days = typeof stored.days === 'number' ? String(stored.days) : null;
    return isPreset(days) ? days : DEFAULT_ANALYTICS_PREFS.period;
}

function isMetric(value: unknown): value is VisitMetric {
    return (VISIT_METRICS as readonly unknown[]).includes(value);
}

export function readAnalyticsPrefs(): AnalyticsPrefs {
    let stored: Partial<Record<keyof AnalyticsPrefs | 'days', unknown>> = {};
    try {
        const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}');
        stored = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        // unreadable or blocked: the defaults
    }
    const defaults = DEFAULT_ANALYTICS_PREFS;
    const lines = Array.isArray(stored.chartLines)
        ? VISIT_METRICS.filter((metric) => (stored.chartLines as unknown[]).includes(metric))
        : [];
    return {
        period: storedPreset(stored),
        chartKind: (CHART_KINDS as readonly unknown[]).includes(stored.chartKind)
            ? (stored.chartKind as ChartKind)
            : defaults.chartKind,
        chartUnit: (CHART_UNITS as readonly unknown[]).includes(stored.chartUnit)
            ? (stored.chartUnit as ChartUnit)
            : defaults.chartUnit,
        chartMetric: isMetric(stored.chartMetric) ? stored.chartMetric : defaults.chartMetric,
        chartLines: lines.length ? lines : defaults.chartLines,
        pageMetric: (PAGE_METRICS as readonly unknown[]).includes(stored.pageMetric)
            ? (stored.pageMetric as PageMetric)
            : defaults.pageMetric,
    };
}

/** Saves the given choices over the remembered ones. */
export function saveAnalyticsPrefs(changes: Partial<AnalyticsPrefs>): void {
    try {
        localStorage.setItem(KEY, JSON.stringify({ ...readAnalyticsPrefs(), ...changes }));
    } catch {
        // storage blocked: the choice holds until the tab is left
    }
}
