import { Component, computed, inject, input } from '@angular/core';
import { VisitStats } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { VisitsChartComponent } from '../visits-chart/visits-chart';
import { VisitsHeatmapComponent } from '../visits-heatmap/visits-heatmap';
import { formatNumber, fullDay, periodLabel } from '../visit-format';

type KpiKey = 'entries' | 'unique' | 'loads' | 'nav' | 'pagesPerEntry' | 'single';

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
        const ratio = (t: { loads: number; nav: number; entries: number }) =>
            t.entries ? (t.loads + t.nav) / t.entries : null;
        const singleShare = (s: { visits: number; single: number }) => (s.visits ? (s.single / s.visits) * 100 : null);
        const pagesPerEntry = ratio(totals);
        const single = singleShare(singlePage);
        const kpi = (key: KpiKey, value: string, delta: KpiDelta | null) => ({
            key,
            value,
            delta,
            label: this.t(`analytics.kpi.${key}`),
            hint: this.t(`analytics.kpiHint.${key}`),
        });
        const count = (key: 'entries' | 'unique' | 'loads' | 'nav') =>
            kpi(key, this.number(totals[key]), this.change(totals[key], previous.totals[key]));
        return [
            count('entries'),
            count('unique'),
            count('loads'),
            count('nav'),
            kpi(
                'pagesPerEntry',
                pagesPerEntry === null ? '–' : this.number(pagesPerEntry, 1),
                this.change(pagesPerEntry, ratio(previous.totals)),
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

    protected readonly dailyRows = computed(() => {
        const locale = this.i18n.locale();
        return [...this.stats().days]
            .reverse()
            .map((day) => ({ ...day, views: day.loads + day.nav, label: fullDay(day.day, locale) }));
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
