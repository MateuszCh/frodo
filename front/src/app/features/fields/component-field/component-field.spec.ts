import { Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';

import { FieldInputComponent } from '../field-input/field-input';
import { ComponentsService } from '../../../core/components.service';
import { FilesService } from '../../../core/files.service';
import { makeField } from '../../../testing/test-helpers';
import type { ComponentEntity, Field } from '../../../models/models';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts.
beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

const COMPONENTS: ComponentEntity[] = [
    { _id: 'c1', id: 1, title: 'Hero', type: 'hero', fields: [makeField('text', 'heading', 'Heading')] },
    { _id: 'c2', id: 2, title: 'Quote', type: 'quote', fields: [makeField('textarea', 'text', 'Text')] },
    { _id: 'c3', id: 3, title: 'Spacer', type: 'spacer', fields: [] },
];

// The "component" field goes through app-field, as in every editor.
@Component({
    template: `
        <form>
            <app-field [field]="field" [model]="model"></app-field>
        </form>
    `,
    imports: [FormsModule, FieldInputComponent],
})
class HostComponent {
    field: Field = makeField('component', 'pick', 'Section');
    model: Record<string, unknown> = {};
}

function makeComponentsService(loaded = true) {
    return { list: signal(loaded ? COMPONENTS : []), loaded: signal(loaded), loadList: vi.fn() };
}

async function setup(
    model: Record<string, unknown> = {},
    field: Field = makeField('component', 'pick', 'Section'),
    componentsService = makeComponentsService(),
) {
    TestBed.configureTestingModule({
        imports: [HostComponent],
        providers: [
            provideNoopAnimations(),
            { provide: ComponentsService, useValue: componentsService },
            { provide: FilesService, useValue: { catalogues: signal<string[]>([]) } },
        ],
    });
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.field = field;
    fixture.componentInstance.model = model;
    fixture.detectChanges();
    // ngModel writes its value a tick later; render the select trigger with it
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const choose = (title: string) => {
        root.querySelector<HTMLElement>('app-component-field mat-select')!.click();
        fixture.detectChanges();
        Array.from(document.querySelectorAll<HTMLElement>('mat-option'))
            .find((o) => o.textContent?.trim() === title)!
            .click();
        fixture.detectChanges();
    };
    const controlNames = () =>
        Object.keys(fixture.debugElement.query(By.directive(NgForm)).injector.get(NgForm).controls);
    return { fixture, root, model, choose, controlNames, componentsService };
}

describe('ComponentFieldComponent', () => {
    it('renders for a "component" field and lists the components', async () => {
        const { fixture, root } = await setup();

        expect(root.querySelector('app-component-field')).not.toBeNull();
        expect(root.querySelector('.field__label')?.textContent?.trim()).toBe('Section');
        root.querySelector<HTMLElement>('app-component-field mat-select')!.click();
        fixture.detectChanges();
        expect(Array.from(document.querySelectorAll('mat-option')).map((o) => o.textContent?.trim())).toEqual([
            'Hero',
            'Quote',
            'Spacer',
        ]);
    });

    it('stores the chosen component like a page row and renders its fields', async () => {
        const { root, model, choose } = await setup();

        choose('Hero');

        expect(model['pick']).toEqual({ type: 'hero', title: 'Hero', data: {} });
        expect(root.querySelector<HTMLInputElement>('.component-field__body input')?.name).toBe('pick.heading');
    });

    it('starts with empty data when another component is chosen', async () => {
        const { root, model, choose } = await setup({ pick: { type: 'hero', title: 'Hero', data: { heading: 'Hi' } } });

        choose('Quote');

        expect(model['pick']).toEqual({ type: 'quote', title: 'Quote', data: {} });
        expect(root.querySelector('.component-field__body textarea')).not.toBeNull();
    });

    it('clears the value', async () => {
        const { fixture, root, model } = await setup({ pick: { type: 'hero', title: 'Hero', data: {} } });

        Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
            .find((b) => b.textContent?.trim() === 'Clear')!
            .click();
        fixture.detectChanges();

        expect(model['pick']).toBeNull();
        expect(root.querySelector('.component-field__body')).toBeNull();
    });

    it('drops stale keys of a saved value', async () => {
        const { model } = await setup({ pick: { type: 'hero', title: 'Hero', data: { heading: 'Hi', old: 1 } } });

        expect(model['pick']).toEqual({ type: 'hero', title: 'Hero', data: { heading: 'Hi' } });
    });

    it('keeps a value whose component is gone and shows it as an option of its own', async () => {
        const saved = { type: 'banner', title: 'Banner', data: { image: 'a.jpg' } };
        const { root, model } = await setup({ pick: saved });

        expect(root.querySelector('app-component-field mat-select')?.textContent?.trim()).toBe(
            'banner (no such component)',
        );
        expect(model['pick']).toEqual(saved);
        expect(root.querySelector('.component-field__body')).toBeNull();
    });

    it('loads the component list itself, in any editor', async () => {
        const { componentsService } = await setup();

        expect(componentsService.loadList).toHaveBeenCalled();
    });

    it('keeps a saved value as it is until the list is loaded', async () => {
        const saved = { type: 'hero', title: 'Hero', data: { heading: 'Hi', old: 1 } };
        const { fixture, root, model, componentsService } = await setup({ pick: saved }, undefined, makeComponentsService(false));

        expect(root.querySelector('app-component-field mat-select')?.textContent).not.toContain('no such component');
        expect(model['pick']).toEqual(saved);

        componentsService.list.set(COMPONENTS);
        componentsService.loaded.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(model['pick']).toEqual({ type: 'hero', title: 'Hero', data: { heading: 'Hi' } });
        expect(root.querySelector('.component-field__body input')).not.toBeNull();
    });

    it('says when the chosen component has no fields', async () => {
        const { root } = await setup({ pick: { type: 'spacer', title: 'Spacer', data: {} } });

        expect(root.querySelector('.component-field__body .field__hint')?.textContent?.trim()).toBe(
            'This component has no fields.',
        );
    });

    it('keeps control names unique for component fields in repeater rows', async () => {
        const repeater = makeField('repeater', 'list', 'Sections', {
            repeaterFields: [makeField('component', 'item', 'Section')],
        });
        const { controlNames } = await setup(
            {
                list: [
                    { item: { type: 'hero', title: 'Hero', data: {} } },
                    { item: { type: 'hero', title: 'Hero', data: {} } },
                ],
            },
            repeater,
        );

        expect(controlNames()).toEqual(['list.0.item.heading', 'list.1.item.heading']);
    });
});
