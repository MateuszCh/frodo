import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ExportDialogComponent, ExportDialogData } from './export-dialog';
import type { ListingRow } from '../../../core/listing.service';

beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

const ITEMS: ListingRow[] = [
    { _id: 'a1', title: 'Castle' },
    { _id: 'b2', title: 'Mine' },
    { _id: 'c3', title: 'Old castle' },
];

function setup(data: Partial<ExportDialogData> = {}) {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
        imports: [ExportDialogComponent],
        providers: [
            provideNoopAnimations(),
            { provide: MatDialogRef, useValue: dialogRef },
            { provide: MAT_DIALOG_DATA, useValue: { title: 'Markers', items: ITEMS, ...data } },
        ],
    });
    const fixture: ComponentFixture<ExportDialogComponent> = TestBed.createComponent(ExportDialogComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const labels = () => Array.from(root.querySelectorAll('mat-checkbox')).map((c) => c.textContent?.trim());
    const checkbox = (title: string) =>
        Array.from(root.querySelectorAll('mat-checkbox'))
            .find((c) => c.textContent?.trim() === title)!
            .querySelector<HTMLInputElement>('input')!;
    const button = (text: string) =>
        Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim().startsWith(text))!;
    const confirm = () => button('Export');
    const toggleAll = () => root.querySelector<HTMLButtonElement>('.post-picker__toggle-all')!;
    /** the label shown; the other one stays in the button, hidden, to keep its width */
    const toggleLabel = () =>
        toggleAll().querySelector('.post-picker__toggle-labels > span:not(.is-hidden)')?.textContent?.trim();
    const search = (text: string) => {
        const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
        input.value = text;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    };
    return { fixture, root, dialogRef, labels, checkbox, confirm, toggleAll, toggleLabel, search };
}

describe('ExportDialogComponent', () => {
    it('lists every item, all of them checked', () => {
        const { root, labels, checkbox, confirm, toggleAll, toggleLabel } = setup();

        expect(root.querySelector('h2')?.textContent?.trim()).toBe('Export: Markers');
        expect(labels()).toEqual(['Castle', 'Mine', 'Old castle']);
        expect(ITEMS.every((item) => checkbox(item.title).checked)).toBe(true);
        expect(confirm().textContent?.trim()).toBe('Export (3)');
        expect(toggleLabel()).toBe('Deselect all');
    });

    it('closes with the chosen ids in the listing order', () => {
        const { fixture, dialogRef, checkbox, confirm } = setup();
        checkbox('Mine').click();
        fixture.detectChanges();
        expect(confirm().textContent?.trim()).toBe('Export (2)');
        confirm().click();
        expect(dialogRef.close).toHaveBeenCalledWith(['a1', 'c3']);
    });

    it('keeps both labels in the button, only one of them shown', () => {
        const { fixture, toggleAll } = setup();
        const hidden = () => Array.from(toggleAll().querySelectorAll('.is-hidden')).map((s) => s.textContent?.trim());
        expect(hidden()).toEqual(['Select all']);
        toggleAll().click();
        fixture.detectChanges();
        expect(hidden()).toEqual(['Deselect all']);
        expect(toggleAll().querySelector('.is-hidden')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('Deselect all unchecks everything and turns into Select all', () => {
        const { fixture, dialogRef, checkbox, confirm, toggleAll, toggleLabel } = setup();
        toggleAll().click();
        fixture.detectChanges();

        expect(ITEMS.some((item) => checkbox(item.title).checked)).toBe(false);
        expect(toggleLabel()).toBe('Select all');
        expect(confirm().textContent?.trim()).toBe('Export (0)');
        expect(confirm().disabled).toBe(true);
        confirm().click();
        expect(dialogRef.close).not.toHaveBeenCalled();

        toggleAll().click();
        fixture.detectChanges();
        expect(ITEMS.every((item) => checkbox(item.title).checked)).toBe(true);
        expect(toggleLabel()).toBe('Deselect all');
    });

    it('Select all checks the rest when some are unchecked', () => {
        const { fixture, checkbox, toggleAll, toggleLabel } = setup();
        checkbox('Mine').click();
        fixture.detectChanges();
        expect(toggleLabel()).toBe('Select all');

        toggleAll().click();
        fixture.detectChanges();
        expect(checkbox('Mine').checked).toBe(true);
    });

    it('Select all / Deselect all act on the items the search shows', () => {
        const { fixture, dialogRef, labels, confirm, toggleAll, toggleLabel, search } = setup();
        search('castle');
        expect(labels()).toEqual(['Castle', 'Old castle']);

        toggleAll().click();
        fixture.detectChanges();
        search('');
        confirm().click();
        expect(dialogRef.close).toHaveBeenCalledWith(['b2']);
    });

    it('says when a search finds nothing', () => {
        const { root, toggleAll, toggleLabel, search } = setup();
        const status = root.querySelector<HTMLElement>('[role="status"]')!;
        expect(status.hidden).toBe(true);

        search('nothing');
        expect(status.hidden).toBe(false);
        expect(status.textContent?.trim()).toBe('Nothing found.');
        expect(root.querySelector('.post-picker__list')).toBeNull();
        expect(toggleAll().disabled).toBe(true);
    });

    it('Escape clears the search first, and only then closes', () => {
        const { fixture, root, labels, search } = setup();
        search('mine');
        const input = root.querySelector<HTMLInputElement>('input[type="search"]')!;
        const escape = () => {
            const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            const stop = vi.spyOn(event, 'stopPropagation');
            input.dispatchEvent(event);
            fixture.detectChanges();
            return stop;
        };

        expect(escape()).toHaveBeenCalled();
        expect(labels()).toEqual(['Castle', 'Mine', 'Old castle']);
        expect(escape()).not.toHaveBeenCalled();
    });
});
