import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription, interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { AnalyticsService } from '../../../core/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { VisitLive } from '../../../models/models';
import { formatNumber } from '../visit-format';

/** How often the count is asked again. */
const REFRESH_MS = 30 * 1000;

/**
 * "3 people on the site now": the visitors of the last five minutes, refreshed every half
 * minute while the Analytics tab is open; the tooltip lists the pages they are on. Shows
 * nothing until the first answer, and nothing when it cannot be loaded.
 */
@Component({
    selector: 'app-analytics-live',
    imports: [MatTooltipModule],
    template: `
        @if (live(); as live) {
        <p class="live"
           [class.live--on]="live.visitors > 0"
           tabindex="0"
           [matTooltip]="hint()"
           matTooltipPosition="below"
           matTooltipClass="metric-tooltip live-tooltip">
            <span class="live__dot"
                  aria-hidden="true"></span>
            {{ live.visitors ? t('analytics.live', { count: live.visitors }) : t('analytics.liveNone') }}
        </p>
        }
    `,
})
export class AnalyticsLiveComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    private readonly service = inject(AnalyticsService);

    protected readonly live = signal<VisitLive | null>(null);

    /** "Visitors of the last 5 minutes." and the pages they are on, one per line. */
    protected readonly hint = computed(() => {
        const live = this.live();
        if (!live) return '';
        const locale = this.i18n.locale();
        const pages = live.pages.map((page) => `${page.page?.title ?? page.key}: ${formatNumber(page.count, locale)}`);
        return [this.t('analytics.liveHint', { minutes: live.minutes }), ...pages].join('\n');
    });

    constructor() {
        // asked at once, then every half minute
        const subscription: Subscription = interval(REFRESH_MS)
            .pipe(
                startWith(0),
                switchMap(() => this.service.live()),
            )
            .subscribe({ next: (live) => this.live.set(live), error: () => this.live.set(null) });
        inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
    }
}
