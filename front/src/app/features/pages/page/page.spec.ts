import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PageComponent } from './page';
import { PagesService } from '../../../core/pages.service';
import { ToolsService } from '../../../core/tools.service';
import { FilesService } from '../../../core/files.service';
import type { ComponentEntity, Page, Settings } from '../../../models/models';

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

async function setup(page?: Page, pageSettings: Settings = settings, components: ComponentEntity[] = []) {
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
    fixture.componentRef.setInput('components', components);
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

describe('PageComponent — collapsing', () => {
    const hero: ComponentEntity = {
        id: 1,
        title: 'Hero',
        type: 'hero',
        fields: [{ title: 'Heading', type: 'text', id: 'heading' }],
    };
    const heroRow = (heading: string) => ({ type: 'hero', title: 'Hero', data: { heading } });

    beforeEach(() => localStorage.removeItem('frodo.expanded'));
    afterEach(() => localStorage.removeItem('frodo.expanded'));

    const sectionBody = (root: HTMLElement, title: string) =>
        Array.from(root.querySelectorAll<HTMLElement>('section.card'))
            .find((c) => c.querySelector('.card__title')?.textContent?.trim() === title)!
            .querySelector<HTMLElement>('.card__body')!;
    const button = (root: HTMLElement, label: string) =>
        Array.from(root.querySelectorAll('button')).find(
            (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
        )!;
    const blockBodies = (root: HTMLElement) =>
        Array.from(root.querySelectorAll<HTMLElement>('.block-card__body')).map((b) => b.hidden);
    // "Expand components" shows in the section's header while the section is expanded
    const expandComponentsSection = (fixture: ComponentFixture<unknown>, root: HTMLElement) => {
        button(root, 'Expand section: Components').click();
        fixture.detectChanges();
    };

    it('starts an edited page with the sections collapsed, and the ones left expanded expanded', async () => {
        const { fixture, root } = await setup(makePage());

        expect(sectionBody(root, 'Basic information').hidden).toBe(true);
        expect(sectionBody(root, 'Search engines').hidden).toBe(true);
        expect(sectionBody(root, 'Components').hidden).toBe(true);

        button(root, 'Expand section: Search engines').click();
        fixture.detectChanges();

        expect(sectionBody(root, 'Search engines').hidden).toBe(false);
        expect(button(root, 'Collapse section: Search engines').getAttribute('aria-expanded')).toBe('true');

        TestBed.resetTestingModule();
        const next = await setup(makePage({ _id: 'p2' }));

        expect(sectionBody(next.root, 'Search engines').hidden).toBe(false);
        expect(sectionBody(next.root, 'Basic information').hidden).toBe(true);
    });

    it('starts a new page with the sections expanded', async () => {
        const { root } = await setup();

        expect(sectionBody(root, 'Basic information').hidden).toBe(false);
        expect(sectionBody(root, 'Search engines').hidden).toBe(false);
    });

    it('expands a collapsed section with an empty required field on save', async () => {
        const { fixture, root, pages } = await setup(makePage({ title: '' }));

        expect(sectionBody(root, 'Basic information').hidden).toBe(true);
        root.querySelector('form')!.dispatchEvent(new Event('submit'));
        fixture.detectChanges();

        expect(pages.edit).not.toHaveBeenCalled();
        expect(sectionBody(root, 'Basic information').hidden).toBe(false);
    });

    it('starts with the components collapsed, keeping their fields in the form', async () => {
        const { root } = await setup(makePage({ rows: [heroRow('One'), heroRow('Two')] }), settings, [hero]);

        expect(blockBodies(root)).toEqual([true, true]);
        expect(root.querySelectorAll('.block-card__body input')).toHaveLength(2);
        expect(button(root, 'Show fields of Hero').getAttribute('aria-expanded')).toBe('false');
    });

    it('expands all components at once, and the next page starts with them expanded', async () => {
        const rows = () => [heroRow('One'), heroRow('Two')];
        const { fixture, root } = await setup(makePage({ rows: rows() }), settings, [hero]);
        expandComponentsSection(fixture, root);

        button(root, 'Expand components').click();
        fixture.detectChanges();

        expect(blockBodies(root)).toEqual([false, false]);

        TestBed.resetTestingModule();
        const next = await setup(makePage({ _id: 'p2', rows: rows() }), settings, [hero]);

        expect(blockBodies(next.root)).toEqual([false, false]);
        // the section was left expanded too
        expect(button(next.root, 'Collapse components')).toBeDefined();

        // one collapsed: not all are expanded any more, the page after starts collapsed
        button(next.root, 'Hide fields of Hero').click();
        next.fixture.detectChanges();
        TestBed.resetTestingModule();
        const third = await setup(makePage({ _id: 'p3', rows: rows() }), settings, [hero]);

        expect(blockBodies(third.root)).toEqual([true, true]);
    });

    it('offers "Expand components" only with more than one component', async () => {
        const { fixture, root } = await setup(makePage({ rows: [heroRow('One')] }), settings, [hero]);
        expandComponentsSection(fixture, root);

        expect(button(root, 'Expand components')).toBeUndefined();
        expect(button(root, 'Show fields of Hero')).toBeDefined();
    });

    it('remembers all components expanded although one of them has no type yet', async () => {
        const untyped = { type: '', title: '', data: {} };
        const { fixture, root } = await setup(makePage({ rows: [heroRow('One'), untyped] }), settings, [hero]);
        expandComponentsSection(fixture, root);

        button(root, 'Show fields of Hero').click();
        fixture.detectChanges();

        expect(JSON.parse(localStorage.getItem('frodo.expanded')!)).toContain('rows:page/components');
        expect(button(root, 'Collapse components')).toBeDefined();
    });

    it('expands all components with one write to the storage', async () => {
        const { fixture, root } = await setup(
            makePage({ rows: [heroRow('One'), heroRow('Two'), heroRow('Three')] }),
            settings,
            [hero],
        );
        expandComponentsSection(fixture, root);
        const setItem = vi.spyOn(Storage.prototype, 'setItem');

        button(root, 'Expand components').click();
        fixture.detectChanges();

        expect(setItem.mock.calls.filter(([key]) => key === 'frodo.expanded')).toHaveLength(1);
        setItem.mockRestore();
    });

    it('opens the fields card of a type chosen while editing', async () => {
        const { chooseType, typeFieldsCard } = await setup(makePage());

        await chooseType('Map');

        expect(typeFieldsCard()!.querySelector<HTMLElement>('.card__body')!.hidden).toBe(false);
    });

    it('opens the fields card again when another type with fields is chosen', async () => {
        const { chooseType, typeFieldsCard } = await setup(makePage({ type: 'map', typeData: {} }));
        expect(typeFieldsCard()!.querySelector<HTMLElement>('.card__body')!.hidden).toBe(true);

        await chooseType('Atlas');

        expect(typeFieldsCard()!.querySelector<HTMLElement>('.card__body')!.hidden).toBe(false);
    });

    it('shows the options of the newly chosen component for a field with the same id', async () => {
        const fieldOf = (selectOptions: string) => ({ title: 'Kind', type: 'select' as const, id: 'kind', selectOptions });
        const a: ComponentEntity = { id: 1, title: 'Alpha', type: 'alpha', fields: [fieldOf('one;two')] };
        const b: ComponentEntity = { id: 2, title: 'Beta', type: 'beta', fields: [fieldOf('x;y')] };
        const { fixture, root } = await setup(
            makePage({ rows: [{ type: 'alpha', title: 'Alpha', data: {} }] }),
            settings,
            [a, b],
        );
        expandComponentsSection(fixture, root);
        const options = (select: HTMLElement) => {
            select.click();
            fixture.detectChanges();
            return Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
        };

        options(root.querySelector<HTMLElement>('.block-card__head mat-select')!)
            .find((o) => o.textContent?.trim() === 'Beta')!
            .click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        const kind = options(root.querySelector<HTMLElement>('.block-card__body mat-select')!).map((o) =>
            o.textContent?.trim(),
        );

        expect(kind).toEqual(expect.arrayContaining(['x', 'y']));
        expect(kind).not.toContain('one');
    });

    it('expands a new component once its type is chosen', async () => {
        const { fixture, root } = await setup(makePage(), settings, [hero]);
        expandComponentsSection(fixture, root);

        button(root, 'Add component').click();
        fixture.detectChanges();
        root.querySelector<HTMLElement>('.block-card mat-select')!.click();
        fixture.detectChanges();
        Array.from(document.querySelectorAll<HTMLElement>('mat-option'))
            .find((o) => o.textContent?.trim() === 'Hero')!
            .click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(blockBodies(root)).toEqual([false]);
    });
});
