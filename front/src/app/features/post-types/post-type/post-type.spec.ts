import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { PostTypeComponent } from './post-type';
import { PostTypesService } from '../../../core/post-types.service';
import { ComponentsService } from '../../../core/components.service';
import { ToolsService } from '../../../core/tools.service';
import type { ComponentEntity, PostType } from '../../../models/models';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts.
beforeEach(() => {
    localStorage.setItem('frodo.lang', 'en');
    localStorage.removeItem('frodo.expanded');
});
afterEach(() => {
    localStorage.removeItem('frodo.lang');
    localStorage.removeItem('frodo.expanded');
});

const marker = (): PostType => ({
    _id: 'pt1',
    id: 1,
    title: 'Marker',
    pluralTitle: 'Markers',
    type: 'marker',
    fields: [
        { title: 'Gallery', type: 'text', id: 'gallery' },
        { title: 'Zoom', type: 'number', id: 'zoom' },
    ],
});

async function setup(schema?: PostType | ComponentEntity, family = 'postTypes') {
    // the server answers with new objects, as a real save does
    const edit = vi.fn((data: PostType) => of(structuredClone(data)));
    const api = { create: vi.fn(), edit, remove: vi.fn() };
    TestBed.configureTestingModule({
        imports: [PostTypeComponent],
        providers: [
            provideRouter([]),
            provideNoopAnimations(),
            { provide: PostTypesService, useValue: { ...api, refreshMenu: vi.fn() } },
            { provide: ComponentsService, useValue: api },
            { provide: ToolsService, useValue: { alert: vi.fn(), scrollToError: vi.fn() } },
        ],
    });
    const fixture = TestBed.createComponent(PostTypeComponent);
    fixture.componentRef.setInput('family', family);
    if (schema) {
        fixture.componentRef.setInput('postType', schema);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const sectionBody = (title: string) =>
        Array.from(root.querySelectorAll<HTMLElement>('section.card'))
            .find((c) => c.querySelector('.card__title')?.textContent?.trim() === title)!
            .querySelector<HTMLElement>('.card__body')!;
    const button = (label: string) =>
        Array.from(root.querySelectorAll('button')).find(
            (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
        )!;
    const card = (name: string) =>
        Array.from(root.querySelectorAll<HTMLElement>('.schema-field')).find(
            (c) => c.querySelector('.schema-field__name')?.textContent?.trim() === name,
        )!;
    const cardBody = (name: string) =>
        card(name).querySelector<HTMLElement>('.schema-field__body')!;
    const click = (target: HTMLElement) => {
        target.click();
        fixture.detectChanges();
    };
    const type = async (input: HTMLInputElement, value: string) => {
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };
    const save = async () => {
        root.querySelector('form')!.dispatchEvent(new Event('submit'));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    };
    const expanded = () => JSON.parse(localStorage.getItem('frodo.expanded') ?? '[]');
    return {
        fixture,
        root,
        edit,
        sectionBody,
        button,
        card,
        cardBody,
        click,
        type,
        save,
        expanded,
    };
}

describe('PostTypeComponent — collapsing', () => {
    it('starts an edited post type with the sections and field cards collapsed', async () => {
        const { sectionBody, cardBody } = await setup(marker());

        expect(sectionBody('Basic information').hidden).toBe(true);
        expect(sectionBody('Fields').hidden).toBe(true);
        expect(cardBody('Gallery').hidden).toBe(true);
        expect(cardBody('Zoom').hidden).toBe(true);
    });

    it('starts a new post type with the sections expanded', async () => {
        const { sectionBody } = await setup();

        expect(sectionBody('Basic information').hidden).toBe(false);
        expect(sectionBody('Fields').hidden).toBe(false);
    });

    it('expands all field cards and remembers each by the type key and the field id', async () => {
        const { button, click, cardBody, expanded } = await setup(marker());

        click(button('Expand section: Fields'));
        click(button('Expand fields'));

        expect(cardBody('Gallery').hidden).toBe(false);
        expect(cardBody('Zoom').hidden).toBe(false);
        expect(expanded()).toEqual([
            'section:post-type/fields',
            'def:post-type:marker/gallery',
            'def:post-type:marker/zoom',
        ]);
        expect(button('Collapse fields')).toBeDefined();
    });

    it('keeps the remembered cards of components apart from those of post types', async () => {
        const hero: ComponentEntity = {
            id: 2,
            title: 'Hero',
            type: 'hero',
            fields: [{ title: 'Heading', type: 'text', id: 'heading' }],
        };
        const { button, click, card, expanded } = await setup(hero, 'components');

        click(button('Expand section: Fields'));
        click(card('Heading').querySelector<HTMLElement>('.schema-field__toggle')!);

        expect(expanded()).toEqual(['section:component/fields', 'def:component:hero/heading']);
    });

    it('opens a new field and keeps it open after the save', async () => {
        const { fixture, button, click, root, cardBody, type, save, edit } = await setup(marker());
        click(button('Expand section: Fields'));

        click(button('Add field'));
        // the new controls register a tick later
        await fixture.whenStable();
        const body = cardBody('Untitled field');
        expect(body.hidden).toBe(false);
        const [title, id] = Array.from(body.querySelectorAll<HTMLInputElement>('input'));
        await type(title, 'Caption');
        await type(id, 'caption');
        await save();

        expect(edit).toHaveBeenCalled();
        // the save answers with new objects: the cards are drawn again
        expect(cardBody('Caption').hidden).toBe(false);
        expect(cardBody('Gallery').hidden).toBe(true);
        expect(root.querySelectorAll('.schema-field')).toHaveLength(3);
    });

    it('keeps an expanded card expanded when its field id is renamed and saved', async () => {
        const { button, click, card, cardBody, type, save } = await setup(marker());
        click(button('Expand section: Fields'));
        click(card('Zoom').querySelector<HTMLElement>('.schema-field__toggle')!);

        const id = cardBody('Zoom').querySelectorAll<HTMLInputElement>('input')[1];
        await type(id, 'scale');
        await save();

        expect(cardBody('Zoom').hidden).toBe(false);
    });

    it('expands the collapsed section and card that hold an empty required field on save', async () => {
        const schema = marker();
        schema.fields[1].title = '';
        const { sectionBody, cardBody, save, edit } = await setup(schema);

        await save();

        expect(edit).not.toHaveBeenCalled();
        expect(sectionBody('Fields').hidden).toBe(false);
        expect(cardBody('Untitled field').hidden).toBe(false);
        expect(cardBody('Gallery').hidden).toBe(true);
    });
});
