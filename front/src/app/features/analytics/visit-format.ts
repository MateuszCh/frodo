// Days of the visit statistics are "YYYY-MM-DD" strings in Polish time. They are shown
// as calendar days, so they are formatted in UTC: no time zone moves them.

function utcTime(day: string): number {
    const [year, month, date] = day.split('-').map(Number);
    return Date.UTC(year, month - 1, date);
}

/** A "YYYY-MM-DD" day as a local midnight Date, for the datepicker. */
export function dateOfDay(day: string): Date {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date);
}

/** A local Date (from the datepicker) as "YYYY-MM-DD". */
export function dayOfDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "7 lis" / "Nov 7": a day on the chart axis. */
export function shortDay(day: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(utcTime(day));
}

/** "sob., 7 lis 2026" / "Sat, Nov 7, 2026": a day in the daily table and the bar tooltips. */
export function fullDay(day: string, locale: string): string {
    return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(utcTime(day));
}

/** "1–31 października 2026" / "October 1 – 31, 2026": the period of a report. */
export function periodLabel(from: string, to: string, locale: string): string {
    const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return from === to ? format.format(utcTime(from)) : format.formatRange(utcTime(from), utcTime(to));
}

/**
 * The top of the value axis and its ticks: a round step (1, 2 or 5 × 10ⁿ) that splits the
 * largest value into at most four parts. An empty chart gets the scale 0–4.
 */
export function niceScale(max: number): { top: number; ticks: number[] } {
    const raw = Math.max(max, 4) / 4;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
    const top = Math.ceil(Math.max(max, 4) / step) * step;
    const ticks: number[] = [];
    for (let tick = 0; tick <= top; tick += step) {
        ticks.push(tick);
    }
    return { top, ticks };
}

/** A number in the interface language, with a fixed count of decimals. */
export function formatNumber(value: number, locale: string, digits = 0): string {
    return value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** `count` as a percentage of `total`, to one decimal; 0 without a total. */
export function sharePercent(count: number, total: number): number {
    return total ? Math.round((count / total) * 1000) / 10 : 0;
}

/** "1 min 25 s" ("1m 25s"): a duration in whole seconds, in the interface language. */
export function formatDuration(seconds: number, locale: string): string {
    const unit = (value: number, name: 'minute' | 'second') =>
        new Intl.NumberFormat(locale, { style: 'unit', unit: name, unitDisplay: 'narrow' }).format(value);
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    if (!minutes) return unit(rest, 'second');
    return rest ? `${unit(minutes, 'minute')} ${unit(rest, 'second')}` : unit(minutes, 'minute');
}

/** "09:00": the start of an hour. */
export function hourLabel(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
}

/** "09:00–10:00": an hour of the day. */
export function hourRange(hour: number): string {
    return `${hourLabel(hour)}–${hourLabel(hour + 1)}`;
}
