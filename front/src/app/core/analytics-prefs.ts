/**
 * What the Analytics tab remembers between visits (localStorage, one key): the preset
 * period, the kind of the daily chart with its metric and lines, and the metric the pages
 * are listed by. A value that is missing, unknown or unreadable falls back to the default;
 * blocked storage only means nothing is remembered.
 */

/** In this order: it fixes each metric's colour (--series-<metric>) everywhere. */
export const VISIT_METRICS = ['entries', 'unique', 'loads', 'nav', 'views'] as const;
export type VisitMetric = (typeof VISIT_METRICS)[number];
export const CHART_KINDS = ['bar', 'line'] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

/** The preset periods, in days; the server takes these only. */
export const VISIT_PRESETS = [7, 30, 90] as const;
export const DEFAULT_VISIT_DAYS = 30;

export interface AnalyticsPrefs {
    days: number;
    chartKind: ChartKind;
    chartMetric: VisitMetric;
    /** never empty */
    chartLines: VisitMetric[];
    pageMetric: VisitMetric;
}

const KEY = 'frodo.analytics';

export const DEFAULT_ANALYTICS_PREFS: AnalyticsPrefs = {
    days: DEFAULT_VISIT_DAYS,
    chartKind: 'bar',
    chartMetric: 'entries',
    chartLines: ['entries'],
    pageMetric: 'entries',
};

function isMetric(value: unknown): value is VisitMetric {
    return (VISIT_METRICS as readonly unknown[]).includes(value);
}

export function readAnalyticsPrefs(): AnalyticsPrefs {
    let stored: Partial<Record<keyof AnalyticsPrefs, unknown>> = {};
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
        days: (VISIT_PRESETS as readonly unknown[]).includes(stored.days) ? (stored.days as number) : defaults.days,
        chartKind: (CHART_KINDS as readonly unknown[]).includes(stored.chartKind)
            ? (stored.chartKind as ChartKind)
            : defaults.chartKind,
        chartMetric: isMetric(stored.chartMetric) ? stored.chartMetric : defaults.chartMetric,
        chartLines: lines.length ? lines : defaults.chartLines,
        pageMetric: isMetric(stored.pageMetric) ? stored.pageMetric : defaults.pageMetric,
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
