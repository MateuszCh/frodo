import { Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule, NgModel } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { FieldInputComponent } from './field-input';
import { RepeaterComponent } from '../repeater/repeater';
import { FilePickerDialogComponent } from '../../files/file-picker-dialog/file-picker-dialog';
import { FilesService } from '../../../core/files.service';
import { makeField } from '../../../testing/test-helpers';
import type { Field } from '../../../models/models';

// ---------------------------------------------------------------------------
// Host
// ---------------------------------------------------------------------------

@Component({
    // ngModel controls inside app-field resolve their ControlContainer from the
    // ancestor NgForm, mirroring the post editor
    template: `
        <form>
            <app-field [field]="field" [model]="model" [namePrefix]="prefix"></app-field>
        </form>
    `,
    imports: [FormsModule, FieldInputComponent],
})
class HostComponent {
    field: Field = makeField('text', 'name', 'Name');
    model: Record<string, unknown> = {};
    prefix = '';
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function createMocks() {
    return {
        files: { catalogues: signal<string[]>(['banners', 'gallery']) },
        dialog: { open: vi.fn() },
    };
}

function setup(
    field: Field,
    model: Record<string, unknown> = {},
    mocks = createMocks(),
    prefix = '',
) {
    // RepeaterComponent is imported via forwardRef(), which TestBed's import
    // override cannot match — render the real one (covered by its own spec).
    TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [
            provideNoopAnimations(),
            { provide: FilesService, useValue: mocks.files },
            { provide: MatDialog, useValue: mocks.dialog },
        ],
    });

    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.field = field;
    fixture.componentInstance.model = model;
    fixture.componentInstance.prefix = prefix;
    fixture.detectChanges();
    const comp = fixture.debugElement.query(By.directive(FieldInputComponent))
        .componentInstance as any;
    return { fixture, comp, mocks, model };
}

/** Click the mat-select trigger and return the option labels from the overlay. */
function openSelectAndReadOptions(fixture: ComponentFixture<HostComponent>): string[] {
    const trigger: HTMLElement = fixture.nativeElement.querySelector('mat-select');
    trigger.click();
    fixture.detectChanges();
    return Array.from(document.querySelectorAll('mat-option')).map(
        (o) => o.textContent?.trim() ?? '',
    );
}

// ---------------------------------------------------------------------------
// ngOnInit — options / model normalisation
// ---------------------------------------------------------------------------

describe('FieldInputComponent — ngOnInit', () => {
    it('parses selectOptions when the server virtuals are absent', () => {
        const { comp } = setup(makeField('select', 's', 'S', { selectOptions: 'a; b ;a' }));
        expect(comp.options).toEqual(['a', 'b']);
    });

    it('prefers server-computed options over selectOptions', () => {
        const { comp } = setup(
            makeField('select', 's', 'S', { options: ['x', 'y'], selectOptions: 'a;b' }),
        );
        expect(comp.options).toEqual(['x', 'y']);
    });

    it('parses multiselectOptions when the server virtuals are absent', () => {
        const { comp } = setup(makeField('multiselect', 'm', 'M', { multiselectOptions: 'a;b' }));
        expect(comp.multiOptions).toEqual(['a', 'b']);
    });

    it('prefers server-computed multiOptions over multiselectOptions', () => {
        const { comp } = setup(
            makeField('multiselect', 'm', 'M', { multiOptions: ['x'], multiselectOptions: 'a;b' }),
        );
        expect(comp.multiOptions).toEqual(['x']);
    });

    it('defaults a null checkbox value to false', () => {
        const { model } = setup(makeField('checkbox', 'flag', 'Flag'), {});
        expect(model['flag']).toBe(false);
    });

    it('keeps an existing checkbox value', () => {
        const { model } = setup(makeField('checkbox', 'flag', 'Flag'), { flag: true });
        expect(model['flag']).toBe(true);
    });

    it('converts an ISO string date value to a Date', () => {
        const { model } = setup(makeField('date', 'when', 'When'), { when: '2024-01-15' });
        expect(model['when']).toBeInstanceOf(Date);
        expect((model['when'] as Date).getFullYear()).toBe(2024);
    });

    it('converts a numeric timestamp date value to a Date', () => {
        const ts = Date.UTC(2023, 5, 1);
        const { model } = setup(makeField('date', 'when', 'When'), { when: ts });
        expect(model['when']).toBeInstanceOf(Date);
        expect((model['when'] as Date).getTime()).toBe(ts);
    });

    it('leaves an existing Date instance untouched', () => {
        const date = new Date(2022, 0, 1);
        const { model } = setup(makeField('date', 'when', 'When'), { when: date });
        expect(model['when']).toBe(date);
    });

    it('leaves a null date value untouched', () => {
        const { model } = setup(makeField('date', 'when', 'When'), { when: null });
        expect(model['when']).toBeNull();
    });

    it('initialises fileSrc from the model for file fields', () => {
        const { comp } = setup(makeField('file', 'img', 'Image'), { img: '/uploads/a.jpg' });
        expect(comp.fileSrc()).toBe('/uploads/a.jpg');
    });

    it('initialises fileSrc to null when the model has no value', () => {
        const { comp } = setup(makeField('file', 'img', 'Image'), {});
        expect(comp.fileSrc()).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Template — one branch per field type
// ---------------------------------------------------------------------------

describe('FieldInputComponent — template per field type', () => {
    it('renders a text input with the field title as its label', () => {
        const { fixture } = setup(makeField('text', 'name', 'Name'));
        const ngModelEl = fixture.debugElement.query(By.css('input[type="text"]'));
        expect(ngModelEl).not.toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Name');
    });

    it('renders a textarea for textarea fields', () => {
        const { fixture } = setup(makeField('textarea', 'desc', 'Description'));
        expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
    });

    it('renders a number input for number fields', () => {
        const { fixture } = setup(makeField('number', 'count', 'Count'));
        expect(fixture.nativeElement.querySelector('input[type="number"]')).not.toBeNull();
    });

    it('renders select options in the overlay', () => {
        const { fixture } = setup(makeField('select', 's', 'S', { selectOptions: 'one;two' }));
        expect(openSelectAndReadOptions(fixture)).toEqual(['one', 'two']);
    });

    it('renders multiselect options in the overlay', () => {
        const { fixture } = setup(
            makeField('multiselect', 'm', 'M', { multiselectOptions: 'red;blue' }),
        );
        expect(openSelectAndReadOptions(fixture)).toEqual(['red', 'blue']);
    });

    it('renders catalogue options from FilesService', () => {
        const { fixture } = setup(makeField('catalogue', 'cat', 'Catalogue'));
        expect(openSelectAndReadOptions(fixture)).toEqual(['banners', 'gallery']);
    });

    it('renders a checkbox with the title and current value', () => {
        const { fixture } = setup(makeField('checkbox', 'flag', 'Active'), { flag: true });
        const checkbox = fixture.nativeElement.querySelector('mat-checkbox');
        expect(checkbox).not.toBeNull();
        expect(checkbox.textContent).toContain('Active');
        expect(checkbox.textContent).toContain('true');
    });

    it('renders a datepicker input for date fields', () => {
        const { fixture } = setup(makeField('date', 'when', 'When'));
        expect(fixture.nativeElement.querySelector('mat-datepicker-toggle')).not.toBeNull();
    });

    it('renders the repeater with the prefixed control name', () => {
        const { fixture } = setup(
            makeField('repeater', 'items', 'Items', { repeaterFields: [] }),
            {},
            createMocks(),
            'p_',
        );
        const repeater = fixture.debugElement.query(By.directive(RepeaterComponent));
        expect(repeater).not.toBeNull();
        expect((repeater.componentInstance as RepeaterComponent).namePrefix()).toBe('p_items');
    });

    it('renders the file picker button and preview when a file is set', () => {
        const { fixture } = setup(makeField('file', 'img', 'Image'), { img: '/uploads/a.jpg' });
        const buttons: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('button'),
        );
        expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Select file', 'Clear']);
        const img = fixture.nativeElement.querySelector('.field-file__preview img');
        expect(img.getAttribute('src')).toBe('/uploads/a.jpg');
    });

    it('hides the clear button and preview when no file is set', () => {
        const { fixture } = setup(makeField('file', 'img', 'Image'), {});
        const buttons: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('button'),
        );
        expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Select file']);
        expect(fixture.nativeElement.querySelector('.field-file__preview')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// ngModel write-back + Clear buttons for every editable field type
// ---------------------------------------------------------------------------

describe('FieldInputComponent — ngModel write-back per field type', () => {
    const cases: Array<{ field: Field; value: unknown }> = [
        { field: makeField('text', 'f', 'F'), value: 'abc' },
        { field: makeField('textarea', 'f', 'F'), value: 'long text' },
        { field: makeField('number', 'f', 'F'), value: 42 },
        { field: makeField('select', 'f', 'F', { selectOptions: 'a;b' }), value: 'b' },
        { field: makeField('multiselect', 'f', 'F', { multiselectOptions: 'a;b' }), value: ['a'] },
        { field: makeField('catalogue', 'f', 'F'), value: 'gallery' },
        { field: makeField('checkbox', 'f', 'F'), value: true },
        { field: makeField('date', 'f', 'F'), value: new Date(2024, 0, 1) },
    ];
    const clearable = ['select', 'multiselect', 'catalogue', 'date'];

    for (const { field, value } of cases) {
        it(`writes the view value into the model for "${field.type}"`, () => {
            const model: Record<string, unknown> = {};
            const { fixture } = setup(field, model);

            const ngModel = fixture.debugElement
                .query(By.directive(NgModel))
                .injector.get(NgModel);
            ngModel.viewToModelUpdate(value);
            fixture.detectChanges();
            expect(model['f']).toEqual(value);

            if (clearable.includes(field.type)) {
                const buttons: HTMLButtonElement[] = Array.from(
                    fixture.nativeElement.querySelectorAll('button'),
                );
                buttons.find((b) => b.textContent?.trim() === 'Clear')!.click();
                fixture.detectChanges();
                expect(model['f']).toBeNull();
            }
        });
    }
});

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------

describe('FieldInputComponent — clear()', () => {
    it('clear button click nulls the model value and the file preview', () => {
        const { fixture, comp, model } = setup(makeField('file', 'img', 'Image'), {
            img: '/uploads/a.jpg',
        });
        const buttons: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('button'),
        );
        buttons.find((b) => b.textContent?.trim() === 'Clear')!.click();
        fixture.detectChanges();
        expect(model['img']).toBeNull();
        expect(comp.fileSrc()).toBeNull();
        expect(fixture.nativeElement.querySelector('.field-file__preview')).toBeNull();
    });

    it('clear button click nulls a select value', () => {
        const { fixture, model } = setup(
            makeField('select', 's', 'S', { selectOptions: 'a;b' }),
            { s: 'a' },
        );
        const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
            '.field-row button',
        );
        clearBtn.click();
        fixture.detectChanges();
        expect(model['s']).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// openFiles()
// ---------------------------------------------------------------------------

describe('FieldInputComponent — openFiles()', () => {
    it('opens the file picker dialog and stores the chosen file src', () => {
        const mocks = createMocks();
        mocks.dialog.open.mockReturnValue({
            afterClosed: () => of({ filename: 'a.jpg', src: '/uploads/a.jpg' }),
        });
        const { fixture, comp, model } = setup(makeField('file', 'img', 'Image'), {}, mocks);

        const buttons: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('button'),
        );
        buttons.find((b) => b.textContent?.trim() === 'Select file')!.click();
        fixture.detectChanges();

        expect(mocks.dialog.open).toHaveBeenCalledWith(
            FilePickerDialogComponent,
            expect.objectContaining({ panelClass: 'file-picker-panel' }),
        );
        expect(model['img']).toBe('/uploads/a.jpg');
        expect(comp.fileSrc()).toBe('/uploads/a.jpg');
    });

    it('stores null when the chosen file has no src', () => {
        const mocks = createMocks();
        mocks.dialog.open.mockReturnValue({ afterClosed: () => of({ filename: 'a.jpg' }) });
        const { comp, model } = setup(makeField('file', 'img', 'Image'), {}, mocks);

        comp.openFiles();

        expect(model['img']).toBeNull();
        expect(comp.fileSrc()).toBeNull();
    });

    it('leaves the model untouched when the dialog is dismissed', () => {
        const mocks = createMocks();
        mocks.dialog.open.mockReturnValue({ afterClosed: () => of(undefined) });
        const { comp, model } = setup(makeField('file', 'img', 'Image'), { img: '/old.jpg' }, mocks);

        comp.openFiles();

        expect(model['img']).toBe('/old.jpg');
        expect(comp.fileSrc()).toBe('/old.jpg');
    });
});
