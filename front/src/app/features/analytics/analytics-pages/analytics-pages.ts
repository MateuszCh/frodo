import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VisitPageRow, VisitPathRef, VisitStats } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PAGE_METRICS, PageMetric, readAnalyticsPrefs, saveAnalyticsPrefs } from '../../../core/analytics-prefs';
import { formatDuration, formatNumber, sharePercent } from '../visit-format';

/** The pages list shows this many rows until it is unfolded. */
const PAGES_SHOWN = 10;

/** Analytics › Pages: every page by any metric, and the moves between pages. */
@Component({
    selector: 'app-analytics-pages',
    imports: [FormsModule, RouterLink, MatButtonModule, MatRadioModule, MatTooltipModule],
    templateUrl: './analytics-pages.html',
})
export class AnalyticsPagesComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly stats = input.required<VisitStats>();

    /** The metric the pages are listed by; remembered. */
    protected readonly pageMetric = signal<PageMetric>(readAnalyticsPrefs().pageMetric);
    protected readonly pagesUnfolded = signal(false);
    protected readonly pageMetrics = computed(() =>
        PAGE_METRICS.map((value) => ({
            value,
            label: this.t(`analytics.metric.${value}`),
            hint: this.t(`analytics.metricHint.${value}`),
            hintId: `page-metric-hint-${value}`,
        })),
    );

    /**
     * The pages with any count of the chosen metric, most first, with their share: of all
     * the period's views or visits, and for visitors the share of the day's visitors who
     * opened the page (summed over the days).
     */
    protected readonly pageList = computed(() => {
        const { totals, pages } = this.stats();
        const metric = this.pageMetric();
        const total = metric === 'entries' || metric === 'exits' ? totals.visits : totals[metric];
        const rows = pages
            .filter((row) => row[metric] > 0)
            .sort((a, b) => b[metric] - a[metric] || a.key.localeCompare(b.key));
        const shown = this.pagesUnfolded() ? rows : rows.slice(0, PAGES_SHOWN);
        return {
            /** entries show which share of the visits stayed on the page */
            showSingle: metric === 'entries',
            /** views show how long the page was visible, once the site sends it */
            showTime: metric === 'views' && pages.some((row) => row.engagement !== null),
            desc: this.t(`analytics.pagesDesc.${metric}`),
            count: rows.length,
            more: rows.length > PAGES_SHOWN,
            rows: shown.map((row) => ({
                row,
                value: row[metric],
                share: Math.min(sharePercent(row[metric], total), 100),
                // of the visits that started on the page, those that stayed on it
                single: row.entries ? sharePercent(row.single, row.entries) : null,
                time: row.engagement === null ? '–' : formatDuration(row.engagement, this.i18n.locale()),
            })),
        };
    });

    /** Addresses that do not exist, each with where its visitors came from. */
    protected readonly notFoundList = computed(() => {
        const rows = this.stats().notFound;
        const max = Math.max(1, ...rows.map((row) => row.count));
        return rows.map((row) => ({
            ...row,
            bar: (row.count / max) * 100,
            sources: this.t('analytics.notFoundFrom', {
                sources: row.sources.map((source) => source.key ?? this.t('analytics.notFoundDirect')).join(', '),
            }),
        }));
    });

    /** Clicked links to other sites and to documents, each with a bar against the most clicked. */
    protected readonly clickLists = computed(() => {
        const { outbound, downloads } = this.stats();
        const list = (rows: { key: string | null; count: number }[]) => {
            const max = Math.max(1, ...rows.map((row) => row.count));
            return rows.map((row) => ({ key: row.key ?? '', count: row.count, bar: (row.count / max) * 100 }));
        };
        return [
            { key: 'outbound', title: this.t('analytics.outbound'), desc: this.t('analytics.outboundDesc'), rows: list(outbound), link: true },
            { key: 'downloads', title: this.t('analytics.downloads'), desc: this.t('analytics.downloadsDesc'), rows: list(downloads), link: false },
        ];
    });

    /** The most frequent moves between pages, with a bar against the most frequent one. */
    protected readonly transitionList = computed(() => {
        const transitions = this.stats().transitions;
        const max = Math.max(1, ...transitions.map((move) => move.count));
        return transitions.map((move) => ({ ...move, bar: (move.count / max) * 100 }));
    });

    protected setPageMetric(metric: PageMetric): void {
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
