import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { AppDateAdapter, provideAppDateAdapter } from './date-adapter';
import { AppDatepickerIntl } from './datepicker-intl';
import { I18nService } from './i18n.service';

afterEach(() => {
    localStorage.removeItem('frodo.lang');
    TestBed.resetTestingModule();
});

function setup(): { adapter: AppDateAdapter; i18n: I18nService } {
    TestBed.configureTestingModule({ providers: [provideAppDateAdapter()] });
    const adapter = TestBed.inject(DateAdapter) as AppDateAdapter;
    TestBed.tick();
    return { adapter, i18n: TestBed.inject(I18nService) };
}

describe('AppDateAdapter', () => {
    it('is provided as the DateAdapter', () => {
        expect(setup().adapter).toBeInstanceOf(AppDateAdapter);
    });

    it('parses Polish dd.mm.yyyy dates', () => {
        const date = setup().adapter.parse('20.10.2026')!;
        expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 20]);
    });

    it('rejects a Polish date that does not exist', () => {
        const { adapter } = setup();
        expect(adapter.isValid(adapter.parse('31.02.2026')!)).toBe(false);
    });

    it('leaves other formats to the native parser', () => {
        const { adapter } = setup();
        const date = adapter.parse('10/20/2026')!;
        expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 20]);
        expect(adapter.parse(null)).toBeNull();
    });

    it('formats dates in the interface language', () => {
        const { adapter, i18n } = setup();
        const date = new Date(2026, 9, 20);
        expect(adapter.format(date, { year: 'numeric', month: 'long' })).toContain('październik');

        i18n.set('en');
        TestBed.tick();
        expect(adapter.format(date, { year: 'numeric', month: 'long' })).toContain('October');
    });
});

describe('AppDatepickerIntl', () => {
    it('labels the calendar in the interface language and announces changes', () => {
        TestBed.configureTestingModule({
            providers: [{ provide: MatDatepickerIntl, useClass: AppDatepickerIntl }],
        });
        const intl = TestBed.inject(MatDatepickerIntl);
        TestBed.tick();
        expect(intl.openCalendarLabel).toBe('Otwórz kalendarz');

        const changed = vi.fn();
        intl.changes.subscribe(changed);
        TestBed.inject(I18nService).set('en');
        TestBed.tick();

        expect(intl.openCalendarLabel).toBe('Open calendar');
        expect(intl.nextMonthLabel).toBe('Next month');
        expect(changed).toHaveBeenCalled();
    });
});
