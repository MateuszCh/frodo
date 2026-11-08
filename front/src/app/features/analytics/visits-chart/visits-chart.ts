import { Component, computed, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VisitDay, VisitHourRow } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { hourLabel, hourRange, niceScale } from '../visit-format';
import { GroupUnit, groupDays } from '../visit-groups';

/** The hours of a day are labelled every third, from midnight. */
const HOUR_LABEL_EVERY = 3;
import {
    ChartKind,
    VISIT_METRICS,
    VisitMetric,
    readAnalyticsPrefs,
    saveAnalyticsPrefs,
} from '../../../core/analytics-prefs';

const METRICS = VISIT_METRICS;

type Counts = Pick<VisitDay, VisitMetric>;

/** A day, or an hour of a one-day period: its counts with its labels. */
interface ChartPoint extends Counts {
    key: string;
    /** under the chart */
    short: string;
    /** in the tooltip */
    full: string;
}

/** The value of a metric on a day or in an hour. */
export function metricValue(point: Counts, metric: VisitMetric): number {
    return point[metric];
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
    imports: [FormsModule, MatRadioModule, MatTooltipModule],
    templateUrl: './visits-chart.html',
})
export class VisitsChartComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly days = input.required<VisitDay[]>();
    /** a period of one day: its hours, drawn instead of the single day */
    readonly hourly = input<VisitHourRow[] | null>(null);
    /** days, weeks or months; the overview picks it, the switch here changes it */
    readonly unit = model<GroupUnit>('day');
    /** the units the period offers; the switch shows when there is more than one */
    readonly units = input<GroupUnit[]>(['day']);

    protected readonly unitOptions = computed(() =>
        this.units().map((value) => ({ value, label: this.t(`analytics.unit.${value}`) })),
    );

    protected readonly points = computed<ChartPoint[]>(() => {
        const hourly = this.hourly();
        if (hourly) {
            return hourly.map((hour) => ({
                ...hour,
                key: `h${hour.hour}`,
                short: hourLabel(hour.hour),
                full: hourRange(hour.hour),
            }));
        }
        return groupDays(this.days(), this.unit(), this.i18n.locale()).map((group) => ({
            ...group,
            full: group.partial ? this.t('analytics.partial', { label: group.full, days: group.partial }) : group.full,
        }));
    });

    // the choices of the last visit (analytics-prefs.ts); every change is remembered
    private readonly prefs = readAnalyticsPrefs();
    protected readonly kind = signal<ChartKind>(this.prefs.chartKind);
    /** the metric of the bars */
    protected readonly metric = signal<VisitMetric>(this.prefs.chartMetric);
    /** the metrics drawn as lines; never empty */
    protected readonly lines = signal<VisitMetric[]>(this.prefs.chartLines);
    /** the day under the pointer */
    protected readonly hovered = signal<number | null>(null);

    /** each with what it means: a tooltip on hover, the description of the option for screen readers */
    protected readonly metrics = computed(() =>
        METRICS.map((value) => ({
            value,
            label: this.t(`analytics.metric.${value}`),
            hint: this.t(`analytics.metricHint.${value}`),
            hintId: `chart-metric-hint-${value}`,
        })),
    );
    protected readonly kinds = computed(() => [
        { value: 'bar' as ChartKind, label: this.t('analytics.kind.bar') },
        { value: 'line' as ChartKind, label: this.t('analytics.kind.line') },
    ]);

    /** what the chart shows, in the fixed order of the metrics */
    protected readonly shown = computed<VisitMetric[]>(() =>
        this.kind() === 'bar' ? [this.metric()] : METRICS.filter((m) => this.lines().includes(m)),
    );

    protected readonly width = computed(() => Math.max(this.points().length, 1) * BAND);
    /** the share of the plot's width one day takes, in percent */
    protected readonly slot = computed(() => 100 / Math.max(this.points().length, 1));

    private readonly scale = computed(() => {
        const shown = this.shown();
        return niceScale(Math.max(0, ...this.points().flatMap((point) => shown.map((m) => metricValue(point, m)))));
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
        return this.points().map((point, i) => ({
            key: point.key,
            left: (i + 0.5) * slot,
            height: (metricValue(point, metric) / top) * 100,
        }));
    });
    protected readonly barWidth = computed(() => `min(24px, ${this.slot() * BAR_SHARE}%)`);

    protected readonly series = computed(() => {
        const { top } = this.scale();
        const days = this.points();
        const shown = this.shown();
        return shown.map((metric) => {
            const points = days.map((point, i) => `${(i + 0.5) * BAND},${100 - (metricValue(point, metric) / top) * 100}`);
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
        const point = i === null ? undefined : this.points()[i];
        if (i === null || !point) return null;
        const { top } = this.scale();
        const locale = this.i18n.locale();
        const left = (i + 0.5) * this.slot();
        return {
            left,
            align: left < 20 ? 'start' : left > 80 ? 'end' : 'center',
            label: point.full,
            rows: this.shown().map((metric) => {
                const value = metricValue(point, metric);
                return {
                    metric,
                    label: this.t(`analytics.metric.${metric}`),
                    value: value.toLocaleString(locale),
                    y: 100 - (value / top) * 100,
                };
            }),
        };
    });

    /**
     * Every n-th day or week, so that at most eight labels fit under the chart (four on a
     * phone); the hours of a day every third (00:00, 03:00…); every month (half on a phone).
     */
    protected readonly labels = computed(() => {
        const points = this.points();
        const every = this.hourly()
            ? HOUR_LABEL_EVERY
            : this.unit() === 'month'
              ? 1
              : Math.ceil(points.length / MAX_LABELS);
        return points
            .map((point, i) => ({ i, label: point.short }))
            .filter(({ i }) => i % every === 0)
            .map(({ i, label }, n) => ({
                left: ((i + 0.5) / points.length) * 100,
                label,
                // a phone shows every other label only
                minor: n % 2 === 1,
            }));
    });

    protected readonly summary = computed(() => {
        const locale = this.i18n.locale();
        const points = this.points();
        if (this.hourly()) {
            // the visitors of the hours do not add up: the busiest hour says more
            return this.shown()
                .map((metric) => {
                    const max = Math.max(0, ...points.map((point) => metricValue(point, metric)));
                    const busiest = points.find((point) => metricValue(point, metric) === max);
                    return this.t('analytics.chartSummaryHours', {
                        metric: this.t(`analytics.metric.${metric}`),
                        hour: busiest && max ? busiest.full : '–',
                        max: max.toLocaleString(locale),
                    });
                })
                .join('; ');
        }
        if (this.unit() !== 'day') {
            return this.shown()
                .map((metric) =>
                    this.t('analytics.chartSummaryGroups', {
                        metric: this.t(`analytics.metric.${metric}`),
                        unit: this.t(`analytics.unit.${this.unit()}`).toLocaleLowerCase(locale),
                        total: points.reduce((sum, point) => sum + metricValue(point, metric), 0).toLocaleString(locale),
                    }),
                )
                .join('; ');
        }
        return this.shown()
            .map((metric) =>
                this.t('analytics.chartSummary', {
                    metric: this.t(`analytics.metric.${metric}`),
                    total: points
                        .reduce((sum, point) => sum + metricValue(point, metric), 0)
                        .toLocaleString(locale),
                    count: points.length,
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

    protected setUnit(unit: GroupUnit): void {
        this.unit.set(unit);
        saveAnalyticsPrefs({ chartUnit: unit });
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
