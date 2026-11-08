import { Component, computed, inject, input } from '@angular/core';
import { VisitHour } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** Every third hour is labelled above the columns; the others are read by screen readers only. */
const LABEL_EVERY = 3;

/** 2026-11-02 was a Monday: day d of the ISO week is 1 + d of November 2026 (UTC). */
function weekdayDate(weekday: number): Date {
    return new Date(Date.UTC(2026, 10, 1 + weekday));
}

/**
 * Views by weekday and hour (Polish time) as a heat map: one hue, lighter to darker with
 * the count. It is a real table: each cell holds its count for screen readers, and the
 * busiest hour is named above it.
 */
@Component({
    selector: 'app-visits-heatmap',
    templateUrl: './visits-heatmap.html',
})
export class VisitsHeatmapComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly hours = input.required<VisitHour[]>();

    private readonly counts = computed(() => {
        const counts = new Map<string, number>();
        this.hours().forEach((row) => counts.set(`${row.weekday}-${row.hour}`, row.count));
        return counts;
    });
    private readonly max = computed(() => Math.max(0, ...this.hours().map((row) => row.count)));

    protected readonly columns = computed(() =>
        HOURS.map((hour) => ({ hour, label: String(hour), shown: hour % LABEL_EVERY === 0 })),
    );

    protected readonly rows = computed(() => {
        const locale = this.i18n.locale();
        const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
        const long = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
        const max = this.max();
        return WEEKDAYS.map((weekday) => {
            const date = weekdayDate(weekday);
            const name = long.format(date);
            return {
                weekday,
                label: short.format(date),
                name,
                cells: HOURS.map((hour) => {
                    const count = this.counts().get(`${weekday}-${hour}`) ?? 0;
                    return {
                        hour,
                        count,
                        text: count.toLocaleString(locale),
                        // the share of the busiest cell sets the strength of the hue
                        level: max ? Math.round((count / max) * 100) : 0,
                        title: this.t('analytics.heatmapCell', {
                            day: name,
                            from: String(hour).padStart(2, '0'),
                            to: String(hour + 1).padStart(2, '0'),
                            count,
                        }),
                    };
                }),
            };
        });
    });

    /** "The busiest: Saturday 18:00–19:00 (5 views)". */
    protected readonly peak = computed(() => {
        const max = this.max();
        if (!max) return '';
        for (const row of this.rows()) {
            const cell = row.cells.find((c) => c.count === max);
            if (cell) return this.t('analytics.heatmapPeak', { cell: cell.title });
        }
        return '';
    });
}
