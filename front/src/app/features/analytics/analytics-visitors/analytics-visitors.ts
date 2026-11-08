import { Component, computed, inject, input } from '@angular/core';
import { VisitStats, VisitTopRow } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { formatNumber, sharePercent } from '../visit-format';

type TableKey = 'referrers' | 'devices' | 'languages';

interface TopTable {
    key: TableKey;
    title: string;
    desc: string;
    /** the hidden header of the first column */
    column: string;
    rows: VisitTopRow[];
    /** what the shares are counted of: all entries */
    total: number;
}

const DEVICES = ['desktop', 'mobile', 'tablet'] as const;
/** The circumference of the device ring (r = 40). */
const RING = 2 * Math.PI * 40;

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

/** Analytics › Visitors: where the entries come from, on which devices and in which languages. */
@Component({
    selector: 'app-analytics-visitors',
    templateUrl: './analytics-visitors.html',
})
export class AnalyticsVisitorsComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    readonly stats = input.required<VisitStats>();

    protected readonly tables = computed<TopTable[]>(() => {
        const stats = this.stats();
        const { entries } = stats.totals;
        const table = (key: TableKey, rows: VisitTopRow[]): TopTable => ({
            key,
            title: this.t(`analytics.table.${key}`),
            desc: this.t(`analytics.tableDesc.${key}`),
            column: this.t(`analytics.column.${key}`),
            rows,
            total: entries,
        });
        return [
            table('referrers', stats.referrers),
            table('devices', stats.devices),
            table('languages', stats.languages),
        ];
    });

    /**
     * The device split of the entries as a ring: one arc per device, 2 units of the
     * surface between neighbours (the radius is 40 of a 100-unit box).
     */
    protected readonly deviceRing = computed(() => {
        const devices = this.stats().devices.filter((row) => row.count > 0);
        const total = devices.reduce((sum, row) => sum + row.count, 0);
        if (!total) return null;
        const gap = devices.length > 1 ? 2 : 0;
        let offset = 0;
        const segments = devices.map((row) => {
            const length = (row.count / total) * RING;
            const segment = {
                key: row.key ?? '',
                dash: `${Math.max(length - gap, 0)} ${RING}`,
                offset: -offset,
            };
            offset += length;
            return segment;
        });
        return { total: this.number(total), count: total, segments };
    });

    /** The label of a row: devices, languages and "direct" are translated, hosts are not. */
    protected rowLabel(table: TableKey, row: VisitTopRow): string {
        if (table === 'devices') {
            return isDevice(row.key) ? this.t(`analytics.device.${row.key}`) : (row.key ?? '');
        }
        if (table === 'languages') {
            return row.key ? languageName(row.key, this.i18n.locale()) : this.t('analytics.unknownLanguage');
        }
        return row.key ?? this.t('analytics.direct');
    }

    protected share(count: number, total: number): number {
        return sharePercent(count, total);
    }

    protected number(value: number, digits = 0): string {
        return formatNumber(value, this.i18n.locale(), digits);
    }
}
