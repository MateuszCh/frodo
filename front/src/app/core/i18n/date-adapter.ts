import { Injectable, Provider, effect, inject } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_NATIVE_DATE_FORMATS, NativeDateAdapter } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { AppDatepickerIntl } from './datepicker-intl';
import { I18nService } from './i18n.service';

/**
 * Native date adapter that follows the interface language: Polish shows and accepts
 * dates as dd.mm.yyyy, English as m/d/yyyy (the browser parses that one itself).
 */
@Injectable()
export class AppDateAdapter extends NativeDateAdapter {
    private i18n = inject(I18nService);

    constructor() {
        super();
        effect(() => this.setLocale(this.i18n.locale()));
    }

    override parse(value: unknown, parseFormat?: unknown): Date | null {
        const match = typeof value === 'string' ? /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(value) : null;
        if (!match) {
            return super.parse(value, parseFormat);
        }
        const [day, month, year] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
        const date = new Date(year, month, day);
        return date.getMonth() === month && date.getDate() === day ? date : this.invalid();
    }
}

/**
 * Replaces provideNativeDateAdapter() in components with date fields: the adapter and
 * the calendar labels follow the interface language. Provided per component, so the
 * datepicker code stays in the lazy chunks.
 */
export function provideAppDateAdapter(): Provider[] {
    return [
        { provide: DateAdapter, useClass: AppDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: MAT_NATIVE_DATE_FORMATS },
        { provide: MatDatepickerIntl, useClass: AppDatepickerIntl },
    ];
}
