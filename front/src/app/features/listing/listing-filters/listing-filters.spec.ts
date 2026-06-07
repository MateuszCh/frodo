import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { ListingFiltersComponent } from './listing-filters';
import type { Filters } from '../listing-filter';

function setup() {
    TestBed.configureTestingModule({
        imports: [ListingFiltersComponent, MatIconTestingModule],
        providers: [provideNoopAnimations(), provideNativeDateAdapter()],
    });
    const fixture = TestBed.createComponent(ListingFiltersComponent);
    fixture.detectChanges();
    return fixture;
}

describe('ListingFiltersComponent', () => {
    it('creates without error', () => {
        const fixture = setup();
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('exposes filters input (undefined by default)', () => {
        const fixture = setup();
        expect(fixture.componentInstance.filters()).toBeUndefined();
    });

    it('exposes type input (empty string by default)', () => {
        const fixture = setup();
        expect(fixture.componentInstance.type()).toBe('');
    });

    it('renders a text input when filters is provided', () => {
        const fixture = setup();
        const filters: Filters = {
            textFilter: { type: 'text', value: undefined },
        };
        fixture.componentRef.setInput('filters', filters);
        fixture.componentRef.setInput('type', 'posts');
        fixture.detectChanges();
        const input = fixture.nativeElement.querySelector('input[matInput], input[data-matinput]') ??
            fixture.nativeElement.querySelector('input');
        expect(input).not.toBeNull();
    });
});
