import { Component, computed, inject, input, model } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { formatNumber, sharePercent } from '../visit-format';

/** One arc of the ring. */
export interface DonutSlice {
    /** unique within the ring; the table rows of the card point to it too */
    key: string;
    label: string;
    count: number;
    /** the series class that gives the arc its colour (`series-*`) */
    series: string;
}

/** The radius of the ring in its 100-unit box, and its circumference. */
const RADIUS = 40;
const RING = 2 * Math.PI * RADIUS;
/** Where the tooltip points: just outside the ring (radius 40 + half the 14-unit stroke). */
const TIP_RADIUS = 47;

/**
 * A split of the visits as a ring, one arc per slice, 2 units of the surface between
 * neighbours. Hovering an arc dims the others and shows its count and share beside it;
 * `hovered` is a model, so the table under the ring can point at an arc too. The ring is
 * hidden from assistive technology: the table carries the same numbers.
 */
@Component({
    selector: 'app-visits-donut',
    templateUrl: './visits-donut.html',
})
export class VisitsDonutComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;

    readonly slices = input.required<DonutSlice[]>();
    /** the key of the arc under the pointer, here or in the table */
    readonly hovered = model<string | null>(null);

    protected readonly total = computed(() => this.slices().reduce((sum, slice) => sum + slice.count, 0));

    protected readonly segments = computed(() => {
        const total = this.total();
        const slices = this.slices().filter((slice) => slice.count > 0);
        if (!total) return [];
        const gap = slices.length > 1 ? 2 : 0;
        let offset = 0;
        return slices.map((slice) => {
            const length = (slice.count / total) * RING;
            const segment = {
                slice,
                dash: `${Math.max(length - gap, 0)} ${RING}`,
                offset: -offset,
                /** the middle of the arc, as a fraction of the turn from the top, clockwise */
                middle: (offset + length / 2) / RING,
            };
            offset += length;
            return segment;
        });
    });

    /** The hovered arc: its name, count and share, beside the middle of the arc. */
    protected readonly tip = computed(() => {
        const key = this.hovered();
        const segment = this.segments().find((s) => s.slice.key === key);
        if (!segment) return null;
        const angle = segment.middle * 2 * Math.PI;
        const top = 50 - TIP_RADIUS * Math.cos(angle);
        return {
            slice: segment.slice,
            left: 50 + TIP_RADIUS * Math.sin(angle),
            top,
            // above an arc in the upper half, below one in the lower half: never over the ring
            place: top <= 50 ? 'above' : 'below',
            count: this.number(segment.slice.count),
            share: `${this.number(sharePercent(segment.slice.count, this.total()), 1)}%`,
        };
    });

    protected readonly totalText = computed(() => this.number(this.total()));

    private number(value: number, digits = 0): string {
        return formatNumber(value, this.i18n.locale(), digits);
    }
}
