import { Injectable, effect, inject } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { I18nService } from './i18n.service';

/** Calendar labels (buttons, screen reader names) in the interface language. */
@Injectable()
export class AppDatepickerIntl extends MatDatepickerIntl {
    private i18n = inject(I18nService);

    constructor() {
        super();
        effect(() => {
            const t = this.i18n.t;
            this.calendarLabel = t('datepicker.calendar');
            this.openCalendarLabel = t('datepicker.open');
            this.closeCalendarLabel = t('datepicker.close');
            this.prevMonthLabel = t('datepicker.prevMonth');
            this.nextMonthLabel = t('datepicker.nextMonth');
            this.prevYearLabel = t('datepicker.prevYear');
            this.nextYearLabel = t('datepicker.nextYear');
            this.prevMultiYearLabel = t('datepicker.prevYears');
            this.nextMultiYearLabel = t('datepicker.nextYears');
            this.switchToMonthViewLabel = t('datepicker.chooseDate');
            this.switchToMultiYearViewLabel = t('datepicker.chooseMonthYear');
            this.changes.next();
        });
    }
}
