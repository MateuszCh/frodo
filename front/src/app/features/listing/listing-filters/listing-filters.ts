import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Filters } from '../listing-filter';

/** Presentational filter panel (port of the listing.html filters markup). */
@Component({
    selector: 'app-listing-filters',
    providers: [provideNativeDateAdapter()],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatRadioModule,
        MatSliderModule,
        MatDatepickerModule,
    ],
    templateUrl: './listing-filters.html',
    styleUrl: './listing-filters.scss',
})
export class ListingFiltersComponent {
    readonly filters = input<Filters>();
    readonly type = input<string>('');
    readonly changed = output<void>();
}
