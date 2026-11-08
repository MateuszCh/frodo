import { VisitDay } from '../../models/models';
import { ChartUnit } from '../../core/analytics-prefs';
import { fullDay, shortDay } from './visit-format';

/**
 * The unit of the daily chart and its table for a period of many days: days, weeks
 * (Monday to Sunday) or months. A period of one day goes by the hour instead (`hourly`).
 */
export type GroupUnit = ChartUnit;

/** Up to a month: days only; up to about four months: days or weeks; longer: months too. */
const DAYS_ONLY = 31;
const WEEKS_AT_MOST = 120;

/** The units a period of `dayCount` days can be shown in; the last one is the default. */
export function unitsFor(dayCount: number): GroupUnit[] {
    if (dayCount <= DAYS_ONLY) return ['day'];
    if (dayCount <= WEEKS_AT_MOST) return ['day', 'week'];
    return ['day', 'week', 'month'];
}

/** The remembered unit when the period offers it, otherwise the period's default. */
export function unitFor(dayCount: number, remembered: GroupUnit | null): GroupUnit {
    const units = unitsFor(dayCount);
    return remembered && units.includes(remembered) ? remembered : units[units.length - 1];
}

type Counts = Pick<VisitDay, 'visitors' | 'visits' | 'views'>;

/** Days, a week or a month of the period, with its counts summed. */
export interface VisitGroup extends Counts {
    key: string;
    /** under the chart: "7 lis", "3–9 lis", "lis" */
    short: string;
    /** in the tooltip and the table: the day, the week's dates or the month */
    full: string;
    /** a week or a month the period covers only in part: its days in the period */
    partial: string | null;
}

function utc(day: string): number {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
}

function dayOfTime(time: number): string {
    return new Date(time).toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The Monday of a day's week, as "YYYY-MM-DD". */
function weekStart(day: string): string {
    const time = utc(day);
    const fromMonday = (new Date(time).getUTCDay() + 6) % 7;
    return dayOfTime(time - fromMonday * DAY_MS);
}

/** The last day of a day's month, as "YYYY-MM-DD". */
function monthEnd(day: string): string {
    const date = new Date(utc(day));
    return dayOfTime(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function range(from: string, to: string, locale: string, options: Intl.DateTimeFormatOptions): string {
    const format = new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' });
    return from === to ? format.format(utc(from)) : format.formatRange(utc(from), utc(to));
}

/**
 * The days of a period summed into the unit, in order. Visits and views add up; visitors
 * are the sum of daily visitors, as in the totals. A week or month cut by the start or the
 * end of the period gets `partial`: the dates it has in it.
 */
export function groupDays(days: VisitDay[], unit: GroupUnit, locale: string): VisitGroup[] {
    if (unit === 'day') {
        return days.map((day) => ({
            visitors: day.visitors,
            visits: day.visits,
            views: day.views,
            key: day.day,
            short: shortDay(day.day, locale),
            full: fullDay(day.day, locale),
            partial: null,
        }));
    }
    const groups = new Map<string, { days: VisitDay[]; start: string; end: string }>();
    for (const day of days) {
        const start = unit === 'week' ? weekStart(day.day) : `${day.day.slice(0, 8)}01`;
        const end = unit === 'week' ? dayOfTime(utc(start) + 6 * DAY_MS) : monthEnd(day.day);
        const group = groups.get(start) ?? { days: [], start, end };
        group.days.push(day);
        groups.set(start, group);
    }
    const years = new Set(days.map((day) => day.day.slice(0, 4)));
    return [...groups.values()].map(({ days: inGroup, start, end }) => {
        const first = inGroup[0].day;
        const last = inGroup[inGroup.length - 1].day;
        const cut = first !== start || last !== end;
        const sum = (key: keyof Counts) => inGroup.reduce((total, day) => total + day[key], 0);
        return {
            visitors: sum('visitors'),
            visits: sum('visits'),
            views: sum('views'),
            key: `${unit}-${start}`,
            short:
                unit === 'week'
                    ? range(start, end, locale, { day: 'numeric', month: 'short' })
                    : range(start, start, locale, years.size > 1 ? { month: 'short', year: '2-digit' } : { month: 'short' }),
            full:
                unit === 'week'
                    ? range(start, end, locale, { day: 'numeric', month: 'short', year: 'numeric' })
                    : range(start, start, locale, { month: 'long', year: 'numeric' }),
            partial: cut ? range(first, last, locale, { day: 'numeric', month: 'short' }) : null,
        };
    });
}
