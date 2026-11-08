import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { VisitPageRow, VisitPathRef, VisitStats } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { VISIT_METRICS, VisitMetric, readAnalyticsPrefs, saveAnalyticsPrefs } from '../../../core/analytics-prefs';
import { formatNumber, sharePercent } from '../visit-format';

/** The pages list shows this many rows until it is unfolded. */
const PAGES_SHOWN = 10;

/** Analytics › Pages: every page by any metric, and the moves between pages. */
@Component({
    selector: 'app-analytics-pages',
    imports: [FormsModule, RouterLink, MatButtonModule, MatRadioModule],
    templateUrl: './analytics-pages.html',
})
export class AnalyticsPagesComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly stats = input.required<VisitStats>();

    /** The metric the pages are listed by, as on the chart; remembered. */
    protected readonly pageMetric = signal<VisitMetric>(readAnalyticsPrefs().pageMetric);
    protected readonly pagesUnfolded = signal(false);
    protected readonly pageMetrics = computed(() =>
        VISIT_METRICS.map((value) => ({ value, label: this.t(`analytics.metric.${value}`) })),
    );

    /**
     * The pages with any count of the chosen metric, most first, with their share: of all
     * the period's entries, loads, transitions or views, and for unique visitors the share
     * of the day's visitors who opened the page (summed over the days).
     */
    protected readonly pageList = computed(() => {
        const { totals, pages } = this.stats();
        const metric = this.pageMetric();
        const total = metric === 'views' ? totals.loads + totals.nav : totals[metric];
        const rows = pages
            .filter((row) => row[metric] > 0)
            .sort((a, b) => b[metric] - a[metric] || a.key.localeCompare(b.key));
        const shown = this.pagesUnfolded() ? rows : rows.slice(0, PAGES_SHOWN);
        return {
            /** entries show which share of the visits stayed on the page */
            showSingle: metric === 'entries',
            desc: this.t(`analytics.pagesDesc.${metric}`),
            count: rows.length,
            more: rows.length > PAGES_SHOWN,
            rows: shown.map((row) => ({
                row,
                value: row[metric],
                share: Math.min(sharePercent(row[metric], total), 100),
                // of the visits that started on the page, those that stayed on it
                single: row.entries ? sharePercent(row.single, row.entries) : null,
            })),
        };
    });

    /** The most frequent moves between pages, with a bar against the most frequent one. */
    protected readonly transitionList = computed(() => {
        const transitions = this.stats().transitions;
        const max = Math.max(1, ...transitions.map((move) => move.count));
        return transitions.map((move) => ({ ...move, bar: (move.count / max) * 100 }));
    });

    protected setPageMetric(metric: VisitMetric): void {
        this.pageMetric.set(metric);
        saveAnalyticsPrefs({ pageMetric: metric });
    }

    protected refLabel(ref: VisitPathRef): string {
        return ref.page?.title ?? ref.path;
    }

    protected pageLabel(row: VisitPageRow): string {
        return row.page?.title ?? row.key;
    }

    protected number(value: number, digits = 0): string {
        return formatNumber(value, this.i18n.locale(), digits);
    }
}
