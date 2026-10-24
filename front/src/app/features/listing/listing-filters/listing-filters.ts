import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { Filters } from '../listing-filter';
import { provideAppDateAdapter } from '../../../core/i18n/date-adapter';
import { I18nService } from '../../../core/i18n/i18n.service';

/** Presentational filter panel (port of the listing.html filters markup). */
@Component({
    selector: 'app-listing-filters',
    providers: [provideAppDateAdapter()],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatRadioModule,
        MatDatepickerModule,
    ],
    templateUrl: './listing-filters.html',
})
export class ListingFiltersComponent {
    protected readonly t = inject(I18nService).t;
    readonly filters = input<Filters>();
    readonly type = input<string>('');
    readonly changed = output<void>();
}
