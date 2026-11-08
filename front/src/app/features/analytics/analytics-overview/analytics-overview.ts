import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { VisitStats } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { VisitsChartComponent } from '../visits-chart/visits-chart';
import { VisitsHeatmapComponent } from '../visits-heatmap/visits-heatmap';
import { VISIT_METRICS, VisitMetric, readAnalyticsPrefs } from '../../../core/analytics-prefs';
import { GroupUnit, groupDays, unitFor, unitsFor } from '../visit-groups';
import { VisitTotals } from '../../../models/models';
import { formatDuration, formatNumber, hourRange, periodLabel, sharePercent } from '../visit-format';

type KpiKey = VisitMetric | 'pagesPerVisit' | 'duration' | 'single';

/** A change against the previous period; `dir` drives the arrow only, never a colour. */
interface KpiDelta {
    text: string;
    dir: 'up' | 'down' | 'same';
}

function direction(value: number): KpiDelta['dir'] {
    return value > 0 ? 'up' : value < 0 ? 'down' : 'same';
}

/** Analytics › Overview: the totals with their change, the days of the period and the visiting hours. */
@Component({
    selector: 'app-analytics-overview',
    imports: [VisitsChartComponent, VisitsHeatmapComponent],
    templateUrl: './analytics-overview.html',
})
export class AnalyticsOverviewComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly stats = input.required<VisitStats>();

    protected readonly kpis = computed(() => {
        const { totals, previous, singlePage } = this.stats();
        const ratio = (t: VisitTotals) => (t.visits ? t.views / t.visits : null);
        // no visits: no average to show or to compare with
        const duration = (t: VisitTotals) => (t.visits ? t.duration : null);
        const singleShare = (s: { visits: number; single: number }) => (s.visits ? (s.single / s.visits) * 100 : null);
        const pagesPerVisit = ratio(totals);
        const single = singleShare(singlePage);
        const kpi = (key: KpiKey, value: string, delta: KpiDelta | null) => ({
            key,
            value,
            delta,
            label: this.t(`analytics.kpi.${key}`),
            hint: this.t(`analytics.kpiHint.${key}`),
        });
        return [
            ...VISIT_METRICS.map((key) =>
                kpi(key, this.number(totals[key]), this.change(totals[key], previous.totals[key])),
            ),
            kpi(
                'pagesPerVisit',
                pagesPerVisit === null ? '–' : this.number(pagesPerVisit, 1),
                this.change(pagesPerVisit, ratio(previous.totals)),
            ),
            kpi(
                'duration',
                totals.visits ? formatDuration(totals.duration, this.i18n.locale()) : '–',
                this.change(duration(totals), duration(previous.totals)),
            ),
            kpi(
                'single',
                single === null ? '–' : `${this.number(single)}%`,
                this.pointsChange(single, singleShare(previous.singlePage)),
            ),
        ];
    });

    /** "26 października – 1 listopada 2026": what the changes under the tiles compare with. */
    protected readonly previousText = computed(() => {
        const { previous } = this.stats();
        // only when some tile has a change to show (the previous period had visits)
        if (!this.kpis().some((kpi) => kpi.delta)) return '';
        return periodLabel(previous.from, previous.to, this.i18n.locale());
    });

    /**
     * How long and how deep people browse: visits per visitor of a day (above 1: returns
     * within the day), the average visible time of a page, and the visits by depth and length.
     */
    protected readonly engagement = computed(() => {
        const { totals, depth, lengths } = this.stats();
        const locale = this.i18n.locale();
        const buckets = (rows: { key: string; count: number }[], prefix: 'depth' | 'lengths') => {
            const total = rows.reduce((sum, row) => sum + row.count, 0);
            return rows.map((row) => ({
                key: row.key,
                label: this.t(`analytics.${prefix}.${row.key}` as `analytics.depth.1`),
                count: this.number(row.count),
                share: sharePercent(row.count, total),
            }));
        };
        return {
            perVisitor: totals.visitors ? this.number(totals.visits / totals.visitors, 2) : '–',
            timeOnPage: totals.engagement === null ? null : formatDuration(totals.engagement, locale),
            depth: buckets(depth, 'depth'),
            lengths: buckets(lengths, 'lengths'),
        };
    });

    /** A period of one day is shown by the hour: its hours instead of the single day. */
    protected readonly hourly = computed(() => this.stats().hourly ?? null);

    /** The units the period's days can be grouped in: weeks from 32 days, months from 121. */
    protected readonly units = computed(() => unitsFor(this.stats().days.length));
    /** The chart and its table follow it; a new period takes the remembered unit when it offers it. */
    protected readonly unit = linkedSignal<GroupUnit>(() =>
        unitFor(this.stats().days.length, readAnalyticsPrefs().chartUnit),
    );

    /** The card's title, description and table follow the hours or the unit. */
    protected readonly texts = computed(() => {
        if (this.hourly()) {
            return {
                title: this.t('analytics.perHour'),
                desc: this.t('analytics.perHourDesc'),
                table: this.t('analytics.hourlyTable'),
                column: this.t('analytics.hour'),
            };
        }
        const unit = this.unit();
        return {
            title: this.t(unit === 'week' ? 'analytics.perWeek' : unit === 'month' ? 'analytics.perMonth' : 'analytics.perDay'),
            desc: this.t(
                unit === 'week' ? 'analytics.perWeekDesc' : unit === 'month' ? 'analytics.perMonthDesc' : 'analytics.perDayDesc',
            ),
            table: this.t(
                unit === 'week' ? 'analytics.weeklyTable' : unit === 'month' ? 'analytics.monthlyTable' : 'analytics.dailyTable',
            ),
            column: this.t(unit === 'week' ? 'analytics.week' : unit === 'month' ? 'analytics.month' : 'analytics.day'),
        };
    });

    /** The rows of the table under the chart: the hours of the day, or the days, weeks or months newest first. */
    protected readonly tableRows = computed(() => {
        const hourly = this.hourly();
        if (hourly) {
            return hourly.map((hour) => ({ ...hour, key: `h${hour.hour}`, label: hourRange(hour.hour) }));
        }
        return groupDays(this.stats().days, this.unit(), this.i18n.locale())
            .reverse()
            .map((group) => ({
                ...group,
                label: group.partial ? this.t('analytics.partial', { label: group.full, days: group.partial }) : group.full,
            }));
    });

    protected number(value: number, digits = 0): string {
        return formatNumber(value, this.i18n.locale(), digits);
    }

    /** "+12%" against the previous period; none when it had nothing to compare with. */
    private change(current: number | null, previous: number | null): KpiDelta | null {
        if (current === null || previous === null || previous === 0) return null;
        const percent = Math.round(((current - previous) / previous) * 100);
        return { text: `${this.signed(percent)}%`, dir: direction(percent) };
    }

    /** "+3 pkt proc.": the change of a share, in percentage points. */
    private pointsChange(current: number | null, previous: number | null): KpiDelta | null {
        if (current === null || previous === null) return null;
        const points = Math.round(current - previous);
        return { text: this.t('analytics.points', { value: this.signed(points) }), dir: direction(points) };
    }

    private signed(value: number): string {
        const text = this.number(Math.abs(value));
        return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text;
    }
}
