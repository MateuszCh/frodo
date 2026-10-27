import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PageComponent } from './page';
import { PagesService } from '../../../core/pages.service';
import { ToolsService } from '../../../core/tools.service';
import { FilesService } from '../../../core/files.service';
import type { Page, Settings } from '../../../models/models';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts.
beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

// "note" is a text in Map and a checkbox in Gallery; Atlas shares Map's "zoom"
const settings: Settings = {
    pageTypes: [
        {
            title: 'Map',
            type: 'map',
            fields: [
                { title: 'Zoom', type: 'number', id: 'zoom' },
                { title: 'Note', type: 'text', id: 'note' },
            ],
        },
        {
            title: 'Gallery',
            type: 'gallery',
            fields: [
                { title: 'Caption', type: 'text', id: 'caption' },
                { title: 'Note', type: 'checkbox', id: 'note' },
            ],
        },
        { title: 'Plain', type: 'plain', fields: [] },
        { title: 'Atlas', type: 'atlas', fields: [{ title: 'Zoom', type: 'number', id: 'zoom' }] },
    ],
};

const makePage = (overrides: Partial<Page> = {}): Page => ({
    _id: 'p1',
    id: 1,
    title: 'Mapa',
    pageUrl: 'mapa',
    rows: [],
    ...overrides,
});

async function setup(page?: Page, pageSettings: Settings = settings) {
    const pages = { create: vi.fn((data: Page) => of(data)), edit: vi.fn((data: Page) => of(data)) };
    TestBed.configureTestingModule({
        imports: [PageComponent],
        providers: [
            provideRouter([]),
            provideNoopAnimations(),
            { provide: PagesService, useValue: pages },
            { provide: ToolsService, useValue: { alert: vi.fn(), scrollToError: vi.fn() } },
            { provide: FilesService, useValue: { catalogues: signal<string[]>([]) } },
        ],
    });
    const fixture = TestBed.createComponent(PageComponent);
    fixture.componentRef.setInput('settings', pageSettings);
    if (page) {
        fixture.componentRef.setInput('page', page);
    }
    fixture.detectChanges();
    // ngModel writes its value a tick later; render the select trigger with it
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const typeSelect = () => root.querySelector<HTMLElement>('mat-select[name="type"]')!;
    const openTypeSelect = () => {
        typeSelect().click();
        fixture.detectChanges();
        return Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
    };
    const typeFieldsCard = () =>
        Array.from(root.querySelectorAll('section.card')).find((card) =>
            card.querySelector('.card__title')?.textContent?.startsWith('Fields of'),
        );
    const chooseType = async (title: string) => {
        openTypeSelect()
            .find((o) => o.textContent?.trim() === title)!
            .click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };
    const save = () => {
        root.querySelector('form')!.dispatchEvent(new Event('submit'));
        fixture.detectChanges();
        return pages.edit.mock.calls.at(-1)![0];
    };
    return { fixture, root, pages, typeSelect, openTypeSelect, typeFieldsCard, chooseType, save };
}

describe('PageComponent — page type', () => {
    it('offers no type and the page types from the settings', async () => {
        const { openTypeSelect } = await setup();

        expect(openTypeSelect().map((o) => o.textContent?.trim())).toEqual([
            'None',
            'Map',
            'Gallery',
            'Plain',
            'Atlas',
        ]);
    });

    it('hides the type select when the settings have no page types', async () => {
        const { root } = await setup(undefined, { pageTypes: [] });

        expect(root.querySelector('mat-select[name="type"]')).toBeNull();
        expect(root.textContent).not.toContain('Page type');
    });

    it('shows the type select without page types for a key the settings do not have', async () => {
        const { typeSelect } = await setup(makePage({ type: 'old' }), { pageTypes: [] });

        expect(typeSelect().textContent?.trim()).toBe('old (not in the settings)');
    });

    it('shows no type fields for a page without a type', async () => {
        const { typeSelect, typeFieldsCard } = await setup();

        expect(typeSelect().textContent?.trim()).toBe('None');
        expect(typeFieldsCard()).toBeUndefined();
    });

    it('shows the fields of the page type', async () => {
        const { typeFieldsCard } = await setup(makePage({ type: 'map', typeData: { zoom: 7 } }));

        const card = typeFieldsCard()!;
        expect(card.querySelector('.card__title')?.textContent?.trim()).toBe('Fields of Map');
        expect(card.querySelectorAll('app-field')).toHaveLength(2);
        expect((card.querySelector('input') as HTMLInputElement).name).toBe('typeData_zoom');
    });

    it('shows the fields of a type chosen in the select', async () => {
        const { fixture, openTypeSelect, typeFieldsCard } = await setup(makePage({ type: 'map' }));

        openTypeSelect()
            .find((o) => o.textContent?.trim() === 'Gallery')!
            .click();
        fixture.detectChanges();

        expect(typeFieldsCard()?.querySelector('.card__title')?.textContent?.trim()).toBe('Fields of Gallery');
        expect(typeFieldsCard()?.querySelector('.field__label')?.textContent?.trim()).toBe('Caption');
    });

    it('hides the type fields card for a type without fields', async () => {
        const { typeFieldsCard } = await setup(makePage({ type: 'plain' }));

        expect(typeFieldsCard()).toBeUndefined();
    });

    it('keeps a key the settings do not have as an option of its own', async () => {
        const { typeSelect } = await setup(makePage({ type: 'old' }));

        expect(typeSelect().textContent?.trim()).toBe('old (not in the settings)');
    });

    it('saves the type and its values', async () => {
        const { save } = await setup(makePage({ type: 'map', typeData: { zoom: 7, note: 'Wide' } }));

        expect(save()).toEqual(expect.objectContaining({ type: 'map', typeData: { zoom: 7, note: 'Wide' } }));
    });

    it('carries over the values of fields both types share with the same kind', async () => {
        const { chooseType, save } = await setup(makePage({ type: 'map', typeData: { zoom: 7, note: 'Wide' } }));

        await chooseType('Atlas');

        expect(save()).toEqual(expect.objectContaining({ type: 'atlas', typeData: { zoom: 7 } }));
    });

    it('does not carry over a value whose field is of another kind in the new type', async () => {
        const { chooseType, save } = await setup(makePage({ type: 'map', typeData: { zoom: 7, note: 'Wide' } }));

        await chooseType('Gallery');

        // the Gallery checkbox starts unchecked instead of reading the Map text
        expect(save().typeData).toEqual({ note: false });
    });

    it('restores the values of a type chosen before', async () => {
        const { chooseType, save } = await setup(makePage({ type: 'map', typeData: { zoom: 7, note: 'Wide' } }));

        await chooseType('Gallery');
        await chooseType('None');
        await chooseType('Map');

        expect(save()).toEqual(expect.objectContaining({ type: 'map', typeData: { zoom: 7, note: 'Wide' } }));
    });

    it('sends the values of a type the settings do not have unchanged, for the server to check', async () => {
        const { save } = await setup(makePage({ type: 'map', typeData: { zoom: 7 } }), { pageTypes: [] });

        expect(save()).toEqual(expect.objectContaining({ type: 'map', typeData: { zoom: 7 } }));
    });
});
