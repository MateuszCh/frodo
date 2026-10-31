import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PostPickerDialogComponent, PostPickerDialogData } from './post-picker-dialog';
import type { Post } from '../../../models/models';

beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

const POSTS: Post[] = [
    { _id: 'p1', id: 11, title: 'Castle', type: 'marker', data: {} },
    { _id: 'p2', id: 12, title: 'Mine', type: 'marker', data: {} },
    { _id: 'p3', id: 13, title: 'Old castle', type: 'marker', data: {} },
];

function setup(data: Partial<PostPickerDialogData> = {}) {
    const dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
        imports: [PostPickerDialogComponent],
        providers: [
            provideNoopAnimations(),
            { provide: MatDialogRef, useValue: dialogRef },
            { provide: MAT_DIALOG_DATA, useValue: { title: 'Markers', posts: POSTS, selected: [], ...data } },
        ],
    });
    const fixture: ComponentFixture<PostPickerDialogComponent> = TestBed.createComponent(PostPickerDialogComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const labels = () => Array.from(root.querySelectorAll('mat-checkbox')).map((c) => c.textContent?.trim());
    const checkbox = (title: string) =>
        Array.from(root.querySelectorAll('mat-checkbox'))
            .find((c) => c.textContent?.trim() === title)!
            .querySelector<HTMLInputElement>('input')!;
    const confirm = () =>
        Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
            .find((b) => b.textContent?.trim().startsWith('Choose'))!;
    return { fixture, root, dialogRef, labels, checkbox, confirm };
}

describe('PostPickerDialogComponent', () => {
    it('lists the posts with the chosen ones checked', () => {
        const { root, labels, checkbox, confirm } = setup({ selected: [12] });

        expect(root.querySelector('h2')?.textContent?.trim()).toBe('Choose posts: Markers');
        expect(labels()).toEqual(['Castle', 'Mine', 'Old castle']);
        expect(checkbox('Mine').checked).toBe(true);
        expect(checkbox('Castle').checked).toBe(false);
        expect(confirm().textContent?.trim()).toBe('Choose (1)');
    });

    it('keeps chosen ids whose posts are gone', () => {
        const { dialogRef, confirm, checkbox } = setup({ selected: [99, 11] });
        checkbox('Mine').click();
        confirm().click();
        expect(dialogRef.close).toHaveBeenCalledWith([99, 11, 12]);
    });

    it('closes with the ids in the order they were chosen', () => {
        const { fixture, dialogRef, checkbox, confirm } = setup({ selected: [12] });

        checkbox('Old castle').click();
        checkbox('Castle').click();
        checkbox('Mine').click();
        fixture.detectChanges();
        confirm().click();

        expect(dialogRef.close).toHaveBeenCalledWith([13, 11]);
    });

    it('filters the posts by title', () => {
        const { fixture, root, labels } = setup();
        const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;

        search.value = 'castle';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(labels()).toEqual(['Castle', 'Old castle']);

        search.value = 'nothing';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(root.textContent).toContain('No posts found.');
    });

    it('says when the post type has no posts', () => {
        const { root } = setup({ posts: [] });
        expect(root.textContent).toContain('There are no posts of this type.');
        expect(root.querySelector('input[type="search"]')).toBeNull();
    });

    it('does not count chosen ids whose posts are gone', () => {
        const { confirm } = setup({ selected: [99, 11] });
        expect(confirm().textContent?.trim()).toBe('Choose (1)');
    });

    it('Escape clears the search first, and only then closes', () => {
        const { fixture, root, labels } = setup();
        const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
        search.value = 'mine';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        const escape = () => {
            const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            const stop = vi.spyOn(event, 'stopPropagation');
            search.dispatchEvent(event);
            fixture.detectChanges();
            return stop;
        };

        expect(escape()).toHaveBeenCalled();
        expect(labels()).toEqual(['Castle', 'Mine', 'Old castle']);
        // with no search the key goes on to the dialog, which closes
        expect(escape()).not.toHaveBeenCalled();
    });

    it('announces when a search finds nothing', () => {
        const { fixture, root } = setup();
        const status = root.querySelector<HTMLElement>('[role="status"]')!;
        expect(status.hidden).toBe(true);

        const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
        search.value = 'nothing';
        search.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(status.hidden).toBe(false);
        expect(status.textContent?.trim()).toBe('No posts found.');
        expect(root.querySelector('.post-picker__list')).toBeNull();
    });
});
