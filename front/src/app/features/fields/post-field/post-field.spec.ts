import { ChangeDetectorRef, Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, of, throwError } from 'rxjs';

import { FieldInputComponent } from '../field-input/field-input';
import { PostPickerDialogComponent } from '../post-picker-dialog/post-picker-dialog';
import { normalizePostFieldValue } from './post-field';
import { PostTypesService } from '../../../core/post-types.service';
import { FilesService } from '../../../core/files.service';
import { EDITED_POST } from '../../../shared/edited-post';
import { makeField, makePostType } from '../../../testing/test-helpers';
import type { Field, Post, PostType } from '../../../models/models';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts.
beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

const MARKERS: Post[] = [
    { _id: 'p1', id: 11, title: 'Castle', type: 'marker', data: {} },
    { _id: 'p2', id: 12, title: 'Mine', type: 'marker', data: {} },
    { _id: 'p3', id: 13, title: 'Cave', type: 'marker', data: {} },
];
const MARKER = makePostType({ _id: 'pt1', id: 1, title: 'Marker', pluralTitle: 'Markers', type: 'marker' });
const notFound = () => new HttpErrorResponse({ status: 404 });

// The "post" field goes through app-field, as in every editor.
@Component({
    template: `
        <form>
            <app-field [field]="field" [model]="model"></app-field>
        </form>
    `,
    imports: [FormsModule, FieldInputComponent],
})
class HostComponent {
    field: Field = makeField('post', 'related', 'Related');
    model: Record<string, unknown> = {};
}

function makePostTypesService(answer: (type: string) => Observable<PostType> = defaultAnswer) {
    return { getPostTitles: vi.fn(answer) };
}
function defaultAnswer(type: string): Observable<PostType> {
    return type === 'marker' ? of({ ...MARKER, posts: MARKERS }) : throwError(notFound);
}

function setup(
    model: Record<string, unknown> = {},
    field: Field = makeField('post', 'related', 'Related', { postType: 'marker' }),
    postTypesService = makePostTypesService(),
    editedPostId?: number,
) {
    const dialog = { open: vi.fn() };
    TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [
            provideNoopAnimations(),
            { provide: PostTypesService, useValue: postTypesService },
            { provide: FilesService, useValue: { catalogues: signal<string[]>([]) } },
            { provide: MatDialog, useValue: dialog },
            ...(editedPostId === undefined
                ? []
                : [{ provide: EDITED_POST, useValue: { postId: signal(editedPostId) } }]),
        ],
    });
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.field = field;
    fixture.componentInstance.model = model;
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const button = (text: string) =>
        Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text);
    const titles = () => Array.from(root.querySelectorAll('.post-field__title')).map((el) => el.textContent?.trim());
    const remove = (name: string) => {
        root.querySelector<HTMLButtonElement>(`[aria-label="Remove from chosen: ${name}"]`)!.click();
        fixture.detectChanges();
    };
    /** the dialog closes with `ids` when Choose posts is clicked */
    const choose = (ids: number[] | undefined) => {
        dialog.open.mockReturnValue({ afterClosed: () => of(ids) });
        button('Choose posts')!.click();
        fixture.detectChanges();
    };
    return { fixture, root, model, button, titles, remove, choose, dialog, postTypesService };
}

describe('PostFieldComponent', () => {
    it('loads the posts of the field post type and shows no post chosen', () => {
        const { root, button, postTypesService } = setup();

        expect(root.querySelector('.field__label')?.textContent?.trim()).toBe('Related');
        expect(postTypesService.getPostTitles).toHaveBeenCalledWith('marker');
        expect(root.textContent).toContain('No posts chosen');
        expect(button('Choose posts')?.disabled).toBe(false);
        expect(button('Clear')).toBeUndefined();
    });

    it('ties the list and the buttons to the field label', () => {
        const { root, button } = setup({ related: { ids: [11] } });
        const labelId = root.querySelector('.field__label')!.id;

        expect(labelId).toMatch(/^post-field-\d+-label$/);
        expect(root.querySelector('.post-field__list')!.getAttribute('aria-labelledby')).toBe(labelId);
        expect(button('Choose posts')!.getAttribute('aria-describedby')).toBe(labelId);
        expect(button('Clear')!.getAttribute('aria-describedby')).toBe(labelId);
    });

    it('opens the dialog with the posts and stores the chosen ids', () => {
        const { fixture, model, button, dialog, titles } = setup();
        const closed = new Subject<number[] | undefined>();
        dialog.open.mockReturnValue({ afterClosed: () => closed });

        button('Choose posts')!.click();

        expect(dialog.open).toHaveBeenCalledWith(
            PostPickerDialogComponent,
            expect.objectContaining({ data: { title: 'Markers', posts: MARKERS, selected: [] } }),
        );
        closed.next([12, 11]);
        fixture.detectChanges();

        expect(model['related']).toEqual({ ids: [12, 11] });
        expect(titles()).toEqual(['Mine', 'Castle']);
    });

    it('does not offer the post being edited', () => {
        const { button, dialog } = setup({}, undefined, undefined, 12);
        dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });

        button('Choose posts')!.click();

        expect(dialog.open.mock.calls[0][1].data.posts.map((p: Post) => p.id)).toEqual([11, 13]);
    });

    it('keeps the value when the dialog is cancelled', () => {
        const model = { related: { ids: [11] } };
        const { choose, dialog } = setup(model);

        choose(undefined);

        expect(dialog.open.mock.calls[0][1].data.selected).toEqual([11]);
        expect(model.related).toEqual({ ids: [11] });
    });

    it('writes the chosen ids into the model bound when the dialog closes', async () => {
        const first = { related: { ids: [11] } };
        const { fixture, button, dialog } = setup(first);
        const closed = new Subject<number[] | undefined>();
        dialog.open.mockReturnValue({ afterClosed: () => closed });
        button('Choose posts')!.click();

        // a save swaps in the server copy while the dialog is open
        const saved: Record<string, unknown> = { related: { ids: [11] } };
        fixture.componentInstance.model = saved;
        fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
        fixture.detectChanges();
        await fixture.whenStable();
        closed.next([11, 13]);

        expect(saved['related']).toEqual({ ids: [11, 13] });
        expect(first.related).toEqual({ ids: [11] });
    });

    it('follows the model swapped in after a save', async () => {
        const { fixture, titles } = setup({ related: { ids: [11] } });

        fixture.componentInstance.model = { related: { ids: [13, 12] } };
        fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(titles()).toEqual(['Cave', 'Mine']);
    });

    it('marks unavailable posts and removes one from the list', () => {
        const model: Record<string, unknown> = { related: { ids: [11, 99] } };
        const { titles, remove } = setup(model);

        expect(titles()).toEqual(['Castle', 'Post #99 (unavailable)']);
        remove('Castle');

        expect(model['related']).toEqual({ ids: [99] });
        expect(titles()).toEqual(['Post #99 (unavailable)']);
    });

    it('moves the focus to the next remove button, then to Choose posts', async () => {
        const model: Record<string, unknown> = { related: { ids: [11, 12] } };
        const { fixture, remove, button } = setup(model);

        remove('Castle');
        await fixture.whenStable();
        expect(document.activeElement?.getAttribute('aria-label')).toBe('Remove from chosen: Mine');

        remove('Mine');
        await fixture.whenStable();
        expect(document.activeElement).toBe(button('Choose posts'));
    });

    it('stores null on Clear and moves the focus to Choose posts', async () => {
        const model: Record<string, unknown> = { related: { ids: [11, 12] } };
        const { fixture, root, button } = setup(model);

        button('Clear')!.click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(model['related']).toBeNull();
        expect(root.textContent).toContain('No posts chosen');
        expect(document.activeElement).toBe(button('Choose posts'));
    });

    it('drops repeated ids and a value of another shape', () => {
        const repeated: Record<string, unknown> = { related: { ids: [11, 11, 12] } };
        setup(repeated);
        expect(repeated['related']).toEqual({ ids: [11, 12] });

        TestBed.resetTestingModule();
        const wrong: Record<string, unknown> = { related: 'marker' };
        setup(wrong);
        expect(wrong['related']).toBeNull();
    });

    it('marks the chosen posts unavailable when the post type is gone', () => {
        const field = makeField('post', 'related', 'Related', { postType: 'gone' });
        const { titles, button } = setup({ related: { ids: [5] } }, field);
        expect(titles()).toEqual(['Post #5 (unavailable)']);
        expect(button('Choose posts')?.disabled).toBe(false);
    });

    it('on another error shows nothing as unavailable and loads again on Try again', () => {
        let fail = true;
        const service = makePostTypesService((type) =>
            fail ? throwError(() => new HttpErrorResponse({ status: 500 })) : defaultAnswer(type),
        );
        const { fixture, root, titles, button } = setup({ related: { ids: [11] } }, undefined, service);

        expect(titles()).toEqual(['#11']);
        expect(root.querySelector('[role="alert"]')?.textContent).toContain('The posts could not be loaded.');
        expect(button('Choose posts')?.disabled).toBe(true);

        fail = false;
        button('Try again')!.click();
        fixture.detectChanges();

        expect(titles()).toEqual(['Castle']);
        expect(root.querySelector('[role="alert"]')).toBeNull();
    });

    it('asks to set the post type when the field has none', () => {
        const { root, button, postTypesService } = setup({}, makeField('post', 'related', 'Related'));
        expect(root.textContent).toContain('This field has no post type set.');
        expect(button('Choose posts')).toBeUndefined();
        expect(postTypesService.getPostTitles).not.toHaveBeenCalled();
    });

    it('stops loading when the field is destroyed', () => {
        let subscribed = 0;
        let unsubscribed = 0;
        const pending = new Observable<PostType>(() => {
            subscribed++;
            return () => unsubscribed++;
        });
        const { fixture } = setup({}, undefined, makePostTypesService(() => pending));
        expect(subscribed).toBe(1);

        fixture.destroy();

        expect(unsubscribed).toBe(1);
    });

    it('works in a repeater row', () => {
        const field = makeField('repeater', 'list', 'List', {
            repeaterFields: [makeField('post', 'related', 'Related', { postType: 'marker' })],
        });
        const model: Record<string, unknown> = { list: [{ related: { ids: [12] } }] };
        const { fixture, root, dialog } = setup(model, field, makePostTypesService(), undefined);

        expect(Array.from(root.querySelectorAll('.post-field__title')).map((el) => el.textContent?.trim())).toEqual([
            'Mine',
        ]);
        dialog.open.mockReturnValue({ afterClosed: () => of([12, 13]) });
        Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
            .find((b) => b.textContent?.trim() === 'Choose posts')!
            .click();
        fixture.detectChanges();

        expect(model['list']).toEqual([{ related: { ids: [12, 13] } }]);
    });
});

describe('normalizePostFieldValue', () => {
    it('keeps a right value as it is', () => {
        const value = { ids: [3, 1] };
        expect(normalizePostFieldValue(value)).toBe(value);
    });

    it('drops repeated and non-integer ids, and empties to null', () => {
        expect(normalizePostFieldValue({ ids: [1, 1, 'x', 2.5, 2] })).toEqual({ ids: [1, 2] });
        expect(normalizePostFieldValue({ ids: [] })).toBeNull();
        expect(normalizePostFieldValue({ ids: ['x'] })).toBeNull();
    });

    it('returns null for another shape', () => {
        expect(normalizePostFieldValue(null)).toBeNull();
        expect(normalizePostFieldValue('marker')).toBeNull();
        expect(normalizePostFieldValue({ postType: 'marker', ids: 'x' })).toBeNull();
    });
});
