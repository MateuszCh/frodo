import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { VisitDay } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { fullDay, niceScale, shortDay } from '../visit-format';
import {
    ChartKind,
    VISIT_METRICS,
    VisitMetric,
    readAnalyticsPrefs,
    saveAnalyticsPrefs,
} from '../../../core/analytics-prefs';

const METRICS = VISIT_METRICS;

/** The value of a metric on a day; views are all pages seen: full loads and in-site transitions. */
export function metricValue(day: VisitDay, metric: VisitMetric): number {
    return metric === 'views' ? day.loads + day.nav : day[metric];
}

/** Width of one day in the line SVG's own units; the SVG stretches to the card. */
const BAND = 10;
/** Bars take 70% of a day, at most 24 px. */
const BAR_SHARE = 0.7;
/** At most this many day labels under the chart. */
const MAX_LABELS = 8;

/**
 * One metric per day as bars, or several as lines. Bars, grid and markers are HTML placed
 * in percent; lines are an SVG stretched to the plot (preserveAspectRatio="none") with
 * strokes that do not scale, so the text and the marks keep their size on any screen.
 * Hovering a day shows its values; the daily table below holds the same data for
 * screen readers.
 */
@Component({
    selector: 'app-visits-chart',
    imports: [FormsModule, MatRadioModule],
    templateUrl: './visits-chart.html',
})
export class VisitsChartComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly days = input.required<VisitDay[]>();

    // the choices of the last visit (analytics-prefs.ts); every change is remembered
    private readonly prefs = readAnalyticsPrefs();
    protected readonly kind = signal<ChartKind>(this.prefs.chartKind);
    /** the metric of the bars */
    protected readonly metric = signal<VisitMetric>(this.prefs.chartMetric);
    /** the metrics drawn as lines; never empty */
    protected readonly lines = signal<VisitMetric[]>(this.prefs.chartLines);
    /** the day under the pointer */
    protected readonly hovered = signal<number | null>(null);

    protected readonly metrics = computed(() =>
        METRICS.map((value) => ({ value, label: this.t(`analytics.metric.${value}`) })),
    );
    protected readonly kinds = computed(() => [
        { value: 'bar' as ChartKind, label: this.t('analytics.kind.bar') },
        { value: 'line' as ChartKind, label: this.t('analytics.kind.line') },
    ]);

    /** what the chart shows, in the fixed order of the metrics */
    protected readonly shown = computed<VisitMetric[]>(() =>
        this.kind() === 'bar' ? [this.metric()] : METRICS.filter((m) => this.lines().includes(m)),
    );

    protected readonly width = computed(() => Math.max(this.days().length, 1) * BAND);
    /** the share of the plot's width one day takes, in percent */
    protected readonly slot = computed(() => 100 / Math.max(this.days().length, 1));

    private readonly scale = computed(() => {
        const shown = this.shown();
        return niceScale(Math.max(0, ...this.days().flatMap((day) => shown.map((m) => metricValue(day, m)))));
    });

    protected readonly ticks = computed(() => {
        const { top, ticks } = this.scale();
        const locale = this.i18n.locale();
        return ticks.map((tick) => ({ y: 100 - (tick / top) * 100, label: tick.toLocaleString(locale) }));
    });

    protected readonly bars = computed(() => {
        const { top } = this.scale();
        const metric = this.metric();
        const slot = this.slot();
        return this.days().map((day, i) => ({
            day: day.day,
            left: (i + 0.5) * slot,
            height: (metricValue(day, metric) / top) * 100,
        }));
    });
    protected readonly barWidth = computed(() => `min(24px, ${this.slot() * BAR_SHARE}%)`);

    protected readonly series = computed(() => {
        const { top } = this.scale();
        const days = this.days();
        const shown = this.shown();
        return shown.map((metric) => {
            const points = days.map((day, i) => `${(i + 0.5) * BAND},${100 - (metricValue(day, metric) / top) * 100}`);
            const first = BAND / 2;
            const last = (days.length - 0.5) * BAND;
            return {
                metric,
                points: points.join(' '),
                // a single line gets a light fill down to the baseline
                area: shown.length === 1 && days.length ? `M${first},100 L${points.join(' L')} L${last},100 Z` : null,
            };
        });
    });

    /** The hovered day: a marker on each line and the values in a tooltip. */
    protected readonly tip = computed(() => {
        const i = this.hovered();
        const day = i === null ? undefined : this.days()[i];
        if (i === null || !day) return null;
        const { top } = this.scale();
        const locale = this.i18n.locale();
        const left = (i + 0.5) * this.slot();
        return {
            left,
            align: left < 20 ? 'start' : left > 80 ? 'end' : 'center',
            label: fullDay(day.day, locale),
            rows: this.shown().map((metric) => {
                const value = metricValue(day, metric);
                return {
                    metric,
                    label: this.t(`analytics.metric.${metric}`),
                    value: value.toLocaleString(locale),
                    y: 100 - (value / top) * 100,
                };
            }),
        };
    });

    /** Every n-th day, so that at most eight labels fit under the chart (four on a phone). */
    protected readonly labels = computed(() => {
        const days = this.days();
        const every = Math.ceil(days.length / MAX_LABELS);
        const locale = this.i18n.locale();
        return days
            .map((day, i) => ({ i, day: day.day }))
            .filter(({ i }) => i % every === 0)
            .map(({ i, day }, n) => ({
                left: ((i + 0.5) / days.length) * 100,
                label: shortDay(day, locale),
                // a phone shows every other label only
                minor: n % 2 === 1,
            }));
    });

    protected readonly summary = computed(() => {
        const locale = this.i18n.locale();
        return this.shown()
            .map((metric) =>
                this.t('analytics.chartSummary', {
                    metric: this.t(`analytics.metric.${metric}`),
                    total: this.days()
                        .reduce((sum, day) => sum + metricValue(day, metric), 0)
                        .toLocaleString(locale),
                    count: this.days().length,
                }),
            )
            .join('; ');
    });

    /** Bars show one metric: switching to them keeps the first line; lines start from the bars' metric. */
    protected setKind(kind: ChartKind): void {
        if (kind === 'line') {
            this.lines.set([this.metric()]);
        } else {
            this.metric.set(this.shown()[0]);
        }
        this.kind.set(kind);
        this.remember();
    }

    protected setMetric(metric: VisitMetric): void {
        this.metric.set(metric);
        this.remember();
    }

    /** Adds or removes a line; the last one stays. */
    protected toggleLine(metric: VisitMetric): void {
        const lines = this.lines();
        if (!lines.includes(metric)) {
            this.lines.set([...lines, metric]);
        } else if (lines.length > 1) {
            this.lines.set(lines.filter((m) => m !== metric));
        }
        this.remember();
    }

    private remember(): void {
        saveAnalyticsPrefs({ chartKind: this.kind(), chartMetric: this.metric(), chartLines: this.lines() });
    }
}
