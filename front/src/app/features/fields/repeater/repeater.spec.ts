import { Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { FilesService } from '../../../core/files.service';
import { ComponentsService } from '../../../core/components.service';
import { CollapseStateService } from '../../../core/collapse-state.service';
import { Field } from '../../../models/models';
import { RepeaterComponent } from './repeater';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts
// and in the Polish rendering tests.
beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

@Component({
    // app-field's ngModel controls resolve their ControlContainer from the
    // ancestor NgForm, mirroring how the post editor hosts the repeater
    template: `
        <form>
            <app-repeater [parentModel]="model" [field]="field" [collapsePath]="collapsePath"></app-repeater>
        </form>
    `,
    imports: [FormsModule, RepeaterComponent],
})
class HostComponent {
    field: Field = {
        id: 'items',
        title: 'Items',
        type: 'repeater',
        repeaterFields: [{ id: 'name', title: 'Name', type: 'text' }],
    };
    model: Record<string, unknown> = { items: [{ name: 'first' }] };
    collapsePath = '';
}

describe('RepeaterComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let remembered: Set<string>;

    beforeEach(() => {
        remembered = new Set();
        TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [
                provideNoopAnimations(),
                { provide: FilesService, useValue: { catalogues: () => [] } },
                { provide: MatDialog, useValue: { open: vi.fn() } },
                // for the rows with a nested component
                {
                    provide: ComponentsService,
                    useValue: { list: signal([]), loaded: signal(true), loadList: vi.fn() },
                },
                {
                    provide: CollapseStateService,
                    useValue: {
                        isExpanded: (key: string) => remembered.has(key),
                        set: vi.fn((key: string, value: boolean) =>
                            value ? remembered.add(key) : remembered.delete(key),
                        ),
                    },
                },
            ],
        });
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
    });

    function rowInputs(): HTMLInputElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('.repeater__row input'));
    }

    function buttonByText(text: string): HTMLButtonElement {
        const buttons: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('button'),
        );
        return buttons.find((b) => b.textContent?.trim() === text)!;
    }

    it('renders one row per existing entry with inputs bound to row values', async () => {
        host.model = { items: [{ name: 'first' }, { name: 'second' }] };
        fixture.detectChanges();
        await fixture.whenStable();

        const inputs = rowInputs();
        expect(inputs.length).toBe(2);
        expect(inputs[0].value).toBe('first');
        expect(inputs[1].value).toBe('second');
    });

    it('creates the array under field.id when the parent model has none', () => {
        host.model = {};
        fixture.detectChanges();

        expect(Array.isArray(host.model['items'])).toBe(true);
        expect(rowInputs().length).toBe(0);
        expect(fixture.nativeElement.textContent).toContain('No rows yet.');
    });

    it('shows the field title and the number of rows', () => {
        host.model = { items: [{ name: 'a' }, { name: 'b' }] };
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.repeater__head .field__label').textContent.trim()).toBe(
            'Items',
        );
        expect(fixture.nativeElement.querySelector('.repeater__head .badge').textContent.trim()).toBe('2 rows');
    });

    it('drops row keys that are not part of the repeater schema (checkModel)', () => {
        host.model = { items: [{ name: 'a', stale: 'x' }] };
        fixture.detectChanges();

        expect(host.model['items']).toEqual([{ name: 'a' }]);
    });

    it('renders rows without fields when the schema has no repeaterFields', () => {
        host.field = { id: 'items', title: 'Items', type: 'repeater' };
        host.model = { items: [{ stale: 1 }] };
        fixture.detectChanges();

        expect(rowInputs()).toHaveLength(0);
        // with no valid ids every row key is dropped
        expect(host.model['items']).toEqual([{}]);
    });

    it('addRow appends an empty row to the parent array', () => {
        fixture.detectChanges();

        buttonByText('Add row').click();
        fixture.detectChanges();

        expect(host.model['items']).toEqual([{ name: 'first' }, {}]);
        expect(rowInputs().length).toBe(2);
    });

    it('removeRow removes the row from the parent array', () => {
        fixture.detectChanges();

        buttonByText('Delete row').click();
        fixture.detectChanges();

        expect(host.model['items']).toEqual([]);
        expect(rowInputs().length).toBe(0);
    });

    it('re-syncs rows when the parent model object is replaced (post editor swaps in the save response)', async () => {
        const original = { items: [{ name: 'original' }] };
        host.model = original;
        fixture.detectChanges();
        await fixture.whenStable();

        // simulate PostComponent.save(): model.set(response) hands the repeater
        // a brand new object — rows must re-bind to it
        const response = { items: [{ name: 'from-server' }] };
        host.model = response;
        fixture.detectChanges();
        await fixture.whenStable();

        const input = rowInputs()[0];
        expect(input.value).toBe('from-server');

        // edits after the swap must land in the new object, not the detached one
        input.value = 'edited-after-save';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(response.items).toEqual([{ name: 'edited-after-save' }]);
        expect(original.items).toEqual([{ name: 'original' }]);
    });

    describe('collapsing rows', () => {
        function toggles(): HTMLButtonElement[] {
            return Array.from(fixture.nativeElement.querySelectorAll('.repeater__row-toggle'));
        }

        function bodies(): HTMLElement[] {
            return Array.from(fixture.nativeElement.querySelectorAll('.repeater__row-body'));
        }

        function summaries(): string[] {
            return Array.from<HTMLElement>(
                fixture.nativeElement.querySelectorAll('.repeater__row-summary'),
            ).map((el) => el.textContent!.trim());
        }

        it('collapses every row at first to its first filled text, keeping its fields rendered', () => {
            host.field = {
                id: 'items',
                title: 'Items',
                type: 'repeater',
                repeaterFields: [
                    { id: 'flag', title: 'Flag', type: 'checkbox' },
                    { id: 'empty', title: 'Empty', type: 'text' },
                    { id: 'name', title: 'Name', type: 'text' },
                ],
            };
            host.model = { items: [{ empty: ' ', name: 'Muzeum' }, { name: 'second' }] };
            fixture.detectChanges();

            expect(toggles().map((b) => b.getAttribute('aria-expanded'))).toEqual(['false', 'false']);
            expect(bodies().map((b) => b.hidden)).toEqual([true, true]);
            expect(toggles()[1].getAttribute('aria-controls')).toBe(bodies()[1].id);
            expect(summaries()).toEqual(['Muzeum', 'second']);
            // the inputs of the collapsed rows stay in the DOM (and in the form)
            expect(rowInputs()).toHaveLength(6);
            // the model is untouched apart from what the fields set themselves
            expect(host.model['items']).toEqual([
                { flag: false, empty: ' ', name: 'Muzeum' },
                { flag: false, name: 'second' },
            ]);
        });

        it('expands and collapses a row', () => {
            host.model = { items: [{ name: 'a' }, { name: 'b' }] };
            fixture.detectChanges();

            toggles()[0].click();
            fixture.detectChanges();

            expect(toggles()[0].getAttribute('aria-expanded')).toBe('true');
            expect(bodies().map((b) => b.hidden)).toEqual([false, true]);
            expect(summaries()).toEqual(['b']);

            toggles()[0].click();
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([true, true]);
            expect(summaries()).toEqual(['a', 'b']);
        });

        it('names a row by the title of a nested component', () => {
            host.field = {
                id: 'items',
                title: 'Items',
                type: 'repeater',
                repeaterFields: [{ id: 'block', title: 'Block', type: 'component' }],
            };
            host.model = { items: [{ block: { type: 'hero', title: 'Hero', data: {} } }] };
            fixture.detectChanges();

            expect(summaries()).toEqual(['Hero']);
        });

        it('expands and collapses all rows at once', () => {
            host.model = { items: [{ name: 'a' }, { name: 'b' }] };
            fixture.detectChanges();

            buttonByText('Expand all').click();
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([false, false]);
            expect(summaries()).toEqual([]);

            buttonByText('Collapse all').click();
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([true, true]);
        });

        it('offers "Expand all" only with more than one row', () => {
            fixture.detectChanges();

            expect(buttonByText('Expand all')).toBeUndefined();
            expect(buttonByText('Collapse all')).toBeUndefined();
        });

        it('keeps the state with its row when a row above is removed, and opens new rows', () => {
            host.model = { items: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] };
            fixture.detectChanges();

            toggles()[2].click();
            fixture.detectChanges();
            buttonByText('Delete row').click();
            fixture.detectChanges();

            expect(summaries()).toEqual(['b']);
            expect(bodies().map((b) => b.hidden)).toEqual([true, false]);

            buttonByText('Add row').click();
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([true, false, false]);
        });

        it('keeps the open rows when the parent model object is replaced', async () => {
            host.model = { items: [{ name: 'a' }, { name: 'b' }] };
            fixture.detectChanges();

            toggles()[1].click();
            fixture.detectChanges();

            host.model = { items: [{ name: 'from-server' }, { name: 'b' }] };
            fixture.detectChanges();
            await fixture.whenStable();
            // the effect re-syncs the rows during that check; they render on the next one
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([true, false]);
            expect(summaries()).toEqual(['from-server']);
        });

        it('does not remember anything without a place in a schema', () => {
            host.model = { items: [{ name: 'a' }, { name: 'b' }] };
            fixture.detectChanges();

            buttonByText('Expand all').click();

            expect(remembered.size).toBe(0);
        });
    });

    describe('rows that move or hold errors', () => {
        function bodies(): HTMLElement[] {
            return Array.from(fixture.nativeElement.querySelectorAll('.repeater__row-body'));
        }

        it('expands the collapsed rows with an invalid control when the form is submitted', async () => {
            host.field = {
                id: 'items',
                title: 'Items',
                type: 'repeater',
                repeaterFields: [
                    { id: 'name', title: 'Name', type: 'text' },
                    { id: 'when', title: 'When', type: 'date' },
                ],
            };
            // a date the datepicker cannot read makes its control invalid
            host.model = { items: [{ name: 'a' }, { name: 'b', when: 'not a date' }, { name: 'c' }] };
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();
            expect(bodies().map((b) => b.hidden)).toEqual([true, true, true]);

            fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([true, false, true]);
            expect(remembered.size).toBe(0);
        });

        it('keeps the file preview with its row when a row above is removed', () => {
            host.field = {
                id: 'items',
                title: 'Items',
                type: 'repeater',
                repeaterFields: [{ id: 'img', title: 'Image', type: 'file' }],
            };
            host.model = { items: [{ img: '/uploads/a.jpg' }, { img: '/uploads/b.jpg' }] };
            fixture.detectChanges();

            buttonByText('Delete row').click();
            fixture.detectChanges();

            const images: HTMLImageElement[] = Array.from(
                fixture.nativeElement.querySelectorAll('.file-field__preview img'),
            );
            expect(images.map((img) => img.getAttribute('src'))).toEqual(['/uploads/b.jpg']);
        });

        it('keeps the expanded rows of a nested repeater with their row when a row above is removed', () => {
            host.field = {
                id: 'items',
                title: 'Items',
                type: 'repeater',
                repeaterFields: [
                    {
                        id: 'links',
                        title: 'Links',
                        type: 'repeater',
                        repeaterFields: [{ id: 'url', title: 'URL', type: 'text' }],
                    },
                ],
            };
            host.model = {
                items: [{ links: [{ url: 'a1' }, { url: 'a2' }] }, { links: [{ url: 'b1' }, { url: 'b2' }] }],
            };
            fixture.detectChanges();

            // the outer "Expand all", then one per row's nested repeater: expand the second row's
            const expandAll = Array.from<HTMLButtonElement>(
                fixture.nativeElement.querySelectorAll('button'),
            ).filter((b) => b.textContent?.trim() === 'Expand all');
            expandAll[2].click();
            fixture.detectChanges();
            buttonByText('Delete row').click();
            fixture.detectChanges();

            const nested: HTMLElement[] = Array.from(
                fixture.nativeElement.querySelectorAll('.repeater__row .repeater__row .repeater__row-body'),
            );
            expect(nested.map((b) => b.hidden)).toEqual([false, false]);
        });
    });

    describe('remembering open rows', () => {
        const KEY = 'rows:post:marker/items';

        function bodies(): HTMLElement[] {
            return Array.from(fixture.nativeElement.querySelectorAll('.repeater__row-body'));
        }

        function toggles(): HTMLButtonElement[] {
            return Array.from(fixture.nativeElement.querySelectorAll('.repeater__row-toggle'));
        }

        beforeEach(() => {
            host.collapsePath = 'post:marker/items';
            host.model = { items: [{ name: 'a' }, { name: 'b' }] };
        });

        it('remembers whether all rows were left open', () => {
            fixture.detectChanges();

            buttonByText('Expand all').click();
            fixture.detectChanges();
            expect(remembered.has(KEY)).toBe(true);

            toggles()[0].click();
            fixture.detectChanges();
            expect(remembered.has(KEY)).toBe(false);

            toggles()[0].click();
            fixture.detectChanges();
            expect(remembered.has(KEY)).toBe(true);
        });

        it('starts with all rows open when they were left so', () => {
            remembered.add(KEY);
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([false, false]);
        });

        it('opens a new row without changing what is remembered', () => {
            fixture.detectChanges();

            buttonByText('Add row').click();
            fixture.detectChanges();
            expect(bodies().map((b) => b.hidden)).toEqual([true, true, false]);

            buttonByText('Delete row').click();
            fixture.detectChanges();
            expect(bodies().map((b) => b.hidden)).toEqual([true, false]);
            expect(remembered.size).toBe(0);
        });

        it('does not collapse the rows again when the model is replaced after a save', async () => {
            fixture.detectChanges();
            toggles()[1].click();
            fixture.detectChanges();

            host.model = { items: [{ name: 'a' }, { name: 'b' }] };
            fixture.detectChanges();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(bodies().map((b) => b.hidden)).toEqual([true, false]);
        });

        it('passes its place on to the fields of its rows', () => {
            host.field = {
                id: 'items',
                title: 'Items',
                type: 'repeater',
                repeaterFields: [
                    {
                        id: 'links',
                        title: 'Links',
                        type: 'repeater',
                        repeaterFields: [{ id: 'url', title: 'URL', type: 'text' }],
                    },
                ],
            };
            host.model = { items: [{ links: [{ url: 'x' }, { url: 'y' }] }] };
            fixture.detectChanges();

            // the nested repeater's own "Expand all" (the outer one has a single row)
            buttonByText('Expand all').click();
            fixture.detectChanges();

            expect(remembered.has('rows:post:marker/items/links')).toBe(true);
        });
    });
});
