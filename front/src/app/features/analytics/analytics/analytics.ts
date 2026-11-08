import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTabsModule } from '@angular/material/tabs';

import { VisitStats } from '../../../models/models';
import { VISIT_PRESETS, visitRangeOf } from '../../../core/analytics.service';
import { readAnalyticsPrefs, saveAnalyticsPrefs } from '../../../core/analytics-prefs';
import { provideAppDateAdapter } from '../../../core/i18n/date-adapter';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AnalyticsOverviewComponent } from '../analytics-overview/analytics-overview';
import { AnalyticsPagesComponent } from '../analytics-pages/analytics-pages';
import { AnalyticsVisitorsComponent } from '../analytics-visitors/analytics-visitors';
import { dateOfDay, dayOfDate, periodLabel } from '../visit-format';

/** The period switch: a preset length in days, or a period of one's own. */
type Period = `${(typeof VISIT_PRESETS)[number]}` | 'custom';

/** The subpages of the tab, each its own route (app.routes.ts, `data.section`). */
export const ANALYTICS_SECTIONS = ['overview', 'pages', 'visitors'] as const;
export type AnalyticsSection = (typeof ANALYTICS_SECTIONS)[number];
const SECTION_LINKS: Record<AnalyticsSection, string> = {
    overview: '/analytics',
    pages: '/analytics/pages',
    visitors: '/analytics/visitors',
};

/**
 * Visit statistics of the public site (geosilesia counts them on its server, without
 * cookies, in the `visits` collection), in three subpages with tabs above them: overview,
 * pages, visitors. The period is shared by all three: a period of one's own lives in the
 * URL (`?from&to`, kept by the tabs), a preset only in localStorage, so the URL stays
 * clean. A new period is a navigation (reloading the same URL for a preset) and the
 * resolver loads it.
 */
@Component({
    selector: 'app-analytics',
    providers: [provideAppDateAdapter()],
    imports: [
        FormsModule,
        RouterLink,
        MatButtonModule,
        MatRadioModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatTabsModule,
        AnalyticsOverviewComponent,
        AnalyticsPagesComponent,
        AnalyticsVisitorsComponent,
    ],
    templateUrl: './analytics.html',
})
export class AnalyticsComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    private readonly router = inject(Router);

    /** from the resolver; null when the statistics could not be loaded */
    readonly stats = input<VisitStats | null>(null);
    /** the subpage, from the route's data */
    readonly section = input<AnalyticsSection>('overview');
    // the query of the URL (withComponentInputBinding)
    readonly from = input<string>();
    readonly to = input<string>();

    protected readonly tabs = computed(() =>
        ANALYTICS_SECTIONS.map((section) => ({
            section,
            link: SECTION_LINKS[section],
            label: this.t(`analytics.section.${section}`),
        })),
    );

    protected readonly presets = VISIT_PRESETS;
    /** the remembered preset, read again when the chosen one is shown */
    private readonly presetDays = signal(readAnalyticsPrefs().days);
    protected readonly range = computed(() => {
        const range = visitRangeOf({ from: this.from(), to: this.to() });
        return 'days' in range ? { days: this.presetDays() } : range;
    });

    /** The switch follows the period; picking "custom" only opens the dates, until they are shown. */
    protected readonly period = linkedSignal<Period>(() => {
        const range = this.range();
        return 'days' in range ? (String(range.days) as Period) : 'custom';
    });
    protected readonly customStart = linkedSignal<Date | null>(() => this.dateOf('from'));
    protected readonly customEnd = linkedSignal<Date | null>(() => this.dateOf('to'));
    protected readonly today = new Date();

    protected readonly periodText = computed(() => {
        const stats = this.stats();
        return stats ? periodLabel(stats.from, stats.to, this.i18n.locale()) : '';
    });

    protected readonly isEmpty = computed(() => {
        const totals = this.stats()?.totals;
        return !totals || totals.loads + totals.nav === 0;
    });

    protected readonly canShowCustom = computed(() => {
        const start = this.customStart();
        const end = this.customEnd();
        return !!start && !!end && start <= end;
    });

    protected choosePeriod(period: Period): void {
        this.period.set(period);
        if (period !== 'custom') {
            // a preset is remembered for the next visit; a period of one's own is not
            saveAnalyticsPrefs({ days: Number(period) });
            this.presetDays.set(Number(period));
            // no query: the resolver reads the preset from localStorage; the same URL is
            // reloaded when the previous period was a preset too
            this.router.navigate([], { queryParams: {}, onSameUrlNavigation: 'reload' });
        }
    }

    protected showCustom(): void {
        const start = this.customStart();
        const end = this.customEnd();
        if (!start || !end || start > end) return;
        this.router.navigate([], { queryParams: { from: dayOfDate(start), to: dayOfDate(end) } });
    }

    /** The datepicker starts at the shown period: the URL's own one, or the preset's days. */
    private dateOf(end: 'from' | 'to'): Date | null {
        const stats = this.stats();
        return stats ? dateOfDay(stats[end]) : null;
    }
}
