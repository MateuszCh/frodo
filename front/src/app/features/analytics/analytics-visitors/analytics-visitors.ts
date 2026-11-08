import { Component, computed, inject, input, signal } from '@angular/core';
import { VisitStats, VisitTopRow } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DonutSlice, VisitsDonutComponent } from '../visits-donut/visits-donut';
import { formatNumber, sharePercent } from '../visit-format';

const TABLES = ['referrers', 'devices', 'languages', 'browsers', 'systems'] as const;
type TableKey = (typeof TABLES)[number];

/** Browser and system families as geosilesia records them, with their names. */
const BROWSERS: Record<string, string> = {
    chrome: 'Chrome',
    safari: 'Safari',
    firefox: 'Firefox',
    edge: 'Edge',
    opera: 'Opera',
    samsung: 'Samsung Internet',
};
const SYSTEMS: Record<string, string> = {
    android: 'Android',
    ios: 'iOS',
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    chromeos: 'ChromeOS',
};

/** A row of a table, with the arc of the ring it belongs to. */
interface TopRow {
    label: string;
    count: number;
    share: number;
    /** the key of its arc: its own, or the "other" arc */
    slice: string;
    series: string;
}

interface TopTable {
    key: TableKey;
    title: string;
    desc: string;
    /** the hidden header of the first column */
    column: string;
    rows: TopRow[];
    slices: DonutSlice[];
}

const DEVICES = ['desktop', 'mobile', 'tablet'] as const;
/** The categorical colours (_analytics.scss): more rows than that fold into "other". */
const SLOTS = 5;
const OTHER = '#other';

function isDevice(key: string | null): key is (typeof DEVICES)[number] {
    return (DEVICES as readonly (string | null)[]).includes(key);
}

/** "Polski", "Niemiecki" / "Polish", "German": a language code in the interface language. */
function languageName(code: string, locale: string): string {
    try {
        const name = new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code;
        return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
    } catch {
        return code;
    }
}

/**
 * Analytics › Visitors: where the visits come from, on which devices and in which
 * languages, each as a ring over its table. Devices keep their own colours; sources and
 * languages take the colours in the order of the list, the first five of them (four when
 * there are more, the rest and whatever the list leaves out folding into one grey arc).
 */
@Component({
    selector: 'app-analytics-visitors',
    imports: [VisitsDonutComponent],
    templateUrl: './analytics-visitors.html',
})
export class AnalyticsVisitorsComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly stats = input.required<VisitStats>();

    /** the arc under the pointer, in the ring or in its table */
    private readonly hover = signal<{ table: TableKey; slice: string } | null>(null);

    protected readonly tables = computed<TopTable[]>(() => {
        const stats = this.stats();
        // hits recorded before geosilesia kept browsers and systems have none
        return TABLES.map((key) => this.table(key, stats[key] ?? [], stats.totals.visits));
    });

    protected hoveredIn(table: TableKey): string | null {
        const hover = this.hover();
        return hover?.table === table ? hover.slice : null;
    }

    protected setHovered(table: TableKey, slice: string | null): void {
        this.hover.set(slice === null ? null : { table, slice });
    }

    private table(key: TableKey, list: VisitTopRow[], visits: number): TopTable {
        // the list is the top of the visits: what it leaves out is "other" too
        const total = Math.max(visits, list.reduce((sum, row) => sum + row.count, 0));
        const own = list.length <= SLOTS && list.reduce((sum, row) => sum + row.count, 0) === total
            ? list.length
            : SLOTS - 1;
        const rows = list.map((row, i): TopRow => {
            const label = this.rowLabel(key, row);
            const inOther = i >= own;
            return {
                label,
                count: row.count,
                share: sharePercent(row.count, total),
                slice: inOther ? OTHER : `${row.key}`,
                series: inOther
                    ? 'series-other'
                    : key === 'devices' && isDevice(row.key)
                      ? `series-${row.key}`
                      : `series-slot-${i + 1}`,
            };
        });
        const slices: DonutSlice[] = rows
            .slice(0, own)
            .map((row) => ({ key: row.slice, label: row.label, count: row.count, series: row.series }));
        const rest = total - slices.reduce((sum, slice) => sum + slice.count, 0);
        if (rest > 0) {
            slices.push({ key: OTHER, label: this.t('analytics.other'), count: rest, series: 'series-other' });
        }
        return {
            key,
            title: this.t(`analytics.table.${key}`),
            desc: this.t(`analytics.tableDesc.${key}`),
            column: this.t(`analytics.column.${key}`),
            rows,
            slices,
        };
    }

    /** The label of a row: devices, languages and "direct" are translated, hosts are not. */
    private rowLabel(table: TableKey, row: VisitTopRow): string {
        if (table === 'devices') {
            return isDevice(row.key) ? this.t(`analytics.device.${row.key}`) : (row.key ?? '');
        }
        if (table === 'languages') {
            return row.key ? languageName(row.key, this.i18n.locale()) : this.t('analytics.unknownLanguage');
        }
        if (table === 'browsers') {
            return row.key ? (BROWSERS[row.key] ?? row.key) : this.t('analytics.unknownBrowser');
        }
        if (table === 'systems') {
            return row.key ? (SYSTEMS[row.key] ?? row.key) : this.t('analytics.unknownSystem');
        }
        return row.key ?? this.t('analytics.direct');
    }

    protected number(value: number, digits = 0): string {
        return formatNumber(value, this.i18n.locale(), digits);
    }
}
