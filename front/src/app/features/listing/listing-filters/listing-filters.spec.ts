import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatSelect } from '@angular/material/select';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ListingFiltersComponent } from './listing-filters';
import type { Filters } from '../listing-filter';

function makeFilters(): Filters {
    return {
        textFilter: { type: 'text', value: undefined },
        checkboxes: { type: 'checkbox', fields: [{ id: 'active', title: 'Active', value: 'all' }] },
        selects: { type: 'select', fields: [{ id: 'cat', title: 'Category', options: ['nature', 'tech'], values: [] }] },
        multiselects: { type: 'multiselect', fields: [{ id: 'tags', title: 'Tags', multiOptions: ['red', 'blue'], values: [] }] },
        catalogues: { type: 'catalogue', fields: [{ id: 'photo', title: 'Photo', options: ['nature', 'tech'], values: [] }] },
        numbers: { type: 'number', fields: [{ id: 'score', title: 'Score', range: [0, 100], minValue: 0, maxValue: 100 }] },
        dates: { type: 'date', fields: [{ id: 'pub', title: 'Published', range: [new Date('2024-01-01'), new Date('2024-12-31')], minValue: new Date('2024-01-01'), maxValue: new Date('2024-12-31') }] },
    };
}

function setup(filters?: Filters, type = 'posts') {
    TestBed.configureTestingModule({
        imports: [ListingFiltersComponent, MatIconTestingModule],
        providers: [provideNoopAnimations(), provideNativeDateAdapter()],
    });
    const fixture = TestBed.createComponent(ListingFiltersComponent);
    if (filters) {
        fixture.componentRef.setInput('filters', filters);
        fixture.componentRef.setInput('type', type);
    }
    fixture.detectChanges();
    return fixture;
}

describe('ListingFiltersComponent — inputs and rendering', () => {
    it('creates without error', () => {
        expect(setup().componentInstance).toBeTruthy();
    });

    it('exposes filters input (undefined by default)', () => {
        expect(setup().componentInstance.filters()).toBeUndefined();
    });

    it('exposes type input (empty string by default)', () => {
        expect(setup().componentInstance.type()).toBe('');
    });

    it('renders a text input when filters is provided', () => {
        const fixture = setup(makeFilters());
        const input = fixture.nativeElement.querySelector('input');
        expect(input).not.toBeNull();
    });
});

// ---------------------------------------------------------------------------
// ngModelChange event handlers — each must be triggered to reach 100%
// ---------------------------------------------------------------------------

describe('ListingFiltersComponent — ngModelChange handlers (line 7, 14, 25, 36, 47)', () => {
    it('fires changed when text search input changes (line 7)', () => {
        const fixture = setup(makeFilters());
        const changedSpy = vi.fn();
        fixture.componentInstance.changed.subscribe(changedSpy);

        const input: HTMLInputElement = fixture.nativeElement.querySelector('mat-form-field:first-of-type input');
        input.value = 'hello';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();

        expect(changedSpy).toHaveBeenCalled();
    });

    it('fires changed when a checkbox radio button is selected (line 14)', () => {
        const fixture = setup(makeFilters());
        const changedSpy = vi.fn();
        fixture.componentInstance.changed.subscribe(changedSpy);

        const radioInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="radio"]');
        radioInput.click();
        fixture.detectChanges();

        expect(changedSpy).toHaveBeenCalled();
    });

    it('fires changed when a select option is chosen (line 25)', () => {
        const fixture = setup(makeFilters());
        const changedSpy = vi.fn();
        fixture.componentInstance.changed.subscribe(changedSpy);

        const selectInstances = fixture.debugElement
            .queryAll(By.directive(MatSelect))
            .map((el) => el.componentInstance as MatSelect);

        // open the first select (selects filter, line 25)
        if (selectInstances.length > 0) {
            selectInstances[0].open();
            fixture.detectChanges();
            const option = document.body.querySelector('mat-option') as HTMLElement;
            option?.click();
            fixture.detectChanges();
        }

        expect(changedSpy).toHaveBeenCalled();
    });

    it('fires changed when a multiselect option is chosen (line 36)', () => {
        const fixture = setup(makeFilters());
        const changedSpy = vi.fn();
        fixture.componentInstance.changed.subscribe(changedSpy);

        const selectInstances = fixture.debugElement
            .queryAll(By.directive(MatSelect))
            .map((el) => el.componentInstance as MatSelect);

        // second select is the multiselect (line 36)
        const multiselect = selectInstances[1] ?? selectInstances[0];
        if (multiselect) {
            multiselect.open();
            fixture.detectChanges();
            const option = document.body.querySelector('mat-option') as HTMLElement;
            option?.click();
            fixture.detectChanges();
        }

        expect(changedSpy).toHaveBeenCalled();
    });

    it('fires changed when a catalogue option is chosen (line 47)', () => {
        const fixture = setup(makeFilters());
        const changedSpy = vi.fn();
        fixture.componentInstance.changed.subscribe(changedSpy);

        const selectInstances = fixture.debugElement
            .queryAll(By.directive(MatSelect))
            .map((el) => el.componentInstance as MatSelect);

        // third select is the catalogue (line 47)
        const catSelect = selectInstances[2] ?? selectInstances[0];
        if (catSelect) {
            catSelect.open();
            fixture.detectChanges();
            const option = document.body.querySelector('mat-option') as HTMLElement;
            option?.click();
            fixture.detectChanges();
        }

        expect(changedSpy).toHaveBeenCalled();
    });
});
