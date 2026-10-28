import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { SettingsComponent } from './settings';
import { SettingsService } from '../../../core/settings.service';
import { ToolsService } from '../../../core/tools.service';
import type { Settings } from '../../../models/models';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts.
beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

const makeSettings = (): Settings => ({
    pageTypes: [{ title: 'Map', type: 'map', fields: [{ title: 'Zoom', type: 'number', id: 'zoom' }] }],
});

async function setup(
    settings?: Settings,
    edit = vi.fn((data: Settings) => of(data)),
    get = vi.fn(() => of(makeSettings())),
    exportData = vi.fn(() => of('/export/settings.json')),
) {
    const tools = { alert: vi.fn(), scrollToError: vi.fn() };
    TestBed.configureTestingModule({
        imports: [SettingsComponent],
        providers: [
            provideNoopAnimations(),
            { provide: SettingsService, useValue: { edit, get, exportData } },
            { provide: ToolsService, useValue: tools },
        ],
    });
    const fixture = TestBed.createComponent(SettingsComponent);
    if (settings) {
        fixture.componentRef.setInput('settings', settings);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;

    const button = (text: string) =>
        Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
    const type = async (input: HTMLInputElement, value: string) => {
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();
    };
    const submit = async () => {
        root.querySelector('form')!.dispatchEvent(new Event('submit'));
        fixture.detectChanges();
        await fixture.whenStable();
    };
    const importFile = async (content: string) => {
        const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
        Object.defineProperty(input, 'files', {
            value: [new File([content], 'settings.json', { type: 'application/json' })],
            configurable: true,
        });
        input.dispatchEvent(new Event('change'));
        await vi.waitFor(() => expect(tools.alert).toHaveBeenCalled());
        fixture.detectChanges();
        await fixture.whenStable();
    };
    return { fixture, root, edit, get, exportData, tools, button, type, submit, importFile };
}

describe('SettingsComponent', () => {
    it('shows the empty state without page types', async () => {
        const { root } = await setup();

        expect(root.querySelector('.empty__title')?.textContent?.trim()).toBe('No page types yet');
        expect(root.querySelector('app-page-type')).toBeNull();
    });

    it('lists the page types with their fields', async () => {
        const { root } = await setup(makeSettings());

        expect(root.querySelectorAll('app-page-type')).toHaveLength(1);
        expect(root.querySelector('.schema-field__name')?.textContent?.trim()).toBe('Map');
        expect(root.querySelector('app-page-type app-add-field')).not.toBeNull();
    });

    it('adds a page type and formats its key as you type', async () => {
        const { fixture, root, button, type } = await setup();

        button('Add page type').click();
        fixture.detectChanges();
        await fixture.whenStable();
        const [title, key] = Array.from(root.querySelectorAll<HTMLInputElement>('app-page-type input'));
        await type(title, 'Gallery');
        await type(key, 'Photo Gallery');

        expect(root.querySelector('app-page-type .badge')?.textContent?.trim()).toBe('photo_gallery');
        expect(root.querySelector('app-page-type .field__hint')?.textContent?.trim()).toBe(
            'Lowercase letters and underscores, formatted as you type.',
        );
    });

    it('adds a field to a page type', async () => {
        const { fixture, root } = await setup(makeSettings());

        const addField = Array.from(root.querySelectorAll('app-page-type button')).find(
            (b) => b.textContent?.trim() === 'Add field',
        ) as HTMLButtonElement;
        addField.click();
        fixture.detectChanges();

        expect(root.querySelectorAll('app-page-type app-add-field')).toHaveLength(2);
    });

    it('removes a page type', async () => {
        const { fixture, root } = await setup(makeSettings());

        (root.querySelector('[aria-label="Delete page type Map"]') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(root.querySelector('app-page-type')).toBeNull();
        expect(root.querySelector('.empty__title')?.textContent?.trim()).toBe('No page types yet');
    });

    it('saves the page types and confirms', async () => {
        const { edit, tools, submit } = await setup(makeSettings());

        await submit();

        expect(edit).toHaveBeenCalledWith(makeSettings());
        expect(tools.alert).toHaveBeenCalledWith('Settings saved successfully');
    });

    it('does not save a page type without a key', async () => {
        const { fixture, root, edit, tools, button, type, submit } = await setup();

        button('Add page type').click();
        fixture.detectChanges();
        await fixture.whenStable();
        await type(root.querySelector<HTMLInputElement>('app-page-type input')!, 'Gallery');
        await submit();

        expect(edit).not.toHaveBeenCalled();
        expect(tools.scrollToError).toHaveBeenCalled();
    });

    it('shows the server message when saving fails', async () => {
        const error = 'Page type "map" is used by pages: Mapa';
        const { tools, submit } = await setup(
            makeSettings(),
            vi.fn(() => throwError(() => ({ error: { error } }))),
        );

        await submit();

        expect(tools.alert).toHaveBeenCalledWith(error);
    });
});

describe('SettingsComponent — page types used by pages', () => {
    const used = (): Settings => ({ ...makeSettings(), usage: { map: ['Mapa', 'Mapa 2'] } });

    it('keeps a used type from being deleted or getting a new key, and says why', async () => {
        const { root } = await setup(used());

        expect(root.querySelector<HTMLButtonElement>('[aria-label="Delete page type Map"]')!.disabled).toBe(true);
        const key = root.querySelectorAll<HTMLInputElement>('app-page-type input')[1];
        expect(key.readOnly).toBe(true);
        expect(root.querySelector('app-page-type .field__hint')?.textContent?.trim()).toBe(
            'Used by pages: Mapa, Mapa 2. It cannot be deleted and its key cannot change.',
        );
    });

    it('does not treat a new type with the same key as the used one', async () => {
        const { fixture, root, button, type } = await setup(used());

        button('Add page type').click();
        fixture.detectChanges();
        await fixture.whenStable();
        const [, second] = Array.from(root.querySelectorAll('app-page-type'));
        await type(second.querySelectorAll<HTMLInputElement>('input')[1], 'map');

        expect(second.querySelectorAll<HTMLInputElement>('input')[1].readOnly).toBe(false);
        expect(second.querySelector<HTMLButtonElement>('button')!.disabled).toBe(false);
    });

    it('takes the usage from the saved settings after a save', async () => {
        const { root, submit } = await setup(
            makeSettings(),
            vi.fn((data: Settings) => of({ ...data, usage: { map: ['Mapa'] } })),
        );

        await submit();

        expect(root.querySelector<HTMLButtonElement>('[aria-label="Delete page type Map"]')!.disabled).toBe(true);
    });
});

describe('SettingsComponent — import and export', () => {
    it('adds the page types of a file to the form and replaces those with the same key', async () => {
        const { root, edit, tools, importFile } = await setup(makeSettings());

        await importFile(
            JSON.stringify({
                pageTypes: [
                    { title: 'Big map', type: 'map', fields: [] },
                    { title: 'Gallery', type: 'Photo Gallery', fields: [{ title: 'Caption', type: 'text', id: 'caption' }] },
                    { title: '', type: 'broken' },
                ],
            }),
        );

        expect(Array.from(root.querySelectorAll('.schema-field__name')).map((n) => n.textContent?.trim())).toContain(
            'Big map',
        );
        expect(root.querySelectorAll('app-page-type')).toHaveLength(2);
        expect(root.querySelectorAll('app-page-type .badge')[1].textContent?.trim()).toBe('photo_gallery');
        expect(tools.alert).toHaveBeenCalledWith('2 page types imported. Save to keep them.');
        expect(edit).not.toHaveBeenCalled();
    });

    it('rejects a file without valid page types', async () => {
        const { tools, importFile } = await setup(makeSettings());

        await importFile(JSON.stringify({ pageTypes: [{ title: 'No key' }] }));

        expect(tools.alert).toHaveBeenCalledWith('There are no valid page types to import in the file');
    });

    it('rejects a file that is not JSON', async () => {
        const { tools, importFile } = await setup(makeSettings());

        await importFile('not json');

        expect(tools.alert).toHaveBeenCalledWith('Wrong file format!');
    });

    it('keeps every value of an imported page type, not only the title, key and fields', async () => {
        const { edit, importFile, submit } = await setup(makeSettings());
        const region = { title: 'Region', type: 'region', fields: [], icon: 'map' };

        await importFile(JSON.stringify({ pageTypes: [region] }));
        await submit();

        expect(edit.mock.calls[0][0].pageTypes[1]).toEqual(region);
    });

    it('downloads the export the server writes', async () => {
        const hrefs: (string | null)[] = [];
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(function (this: HTMLAnchorElement) {
                hrefs.push(this.getAttribute('href'));
            });
        const { button, exportData } = await setup(makeSettings());

        button('Export').click();

        expect(exportData).toHaveBeenCalled();
        expect(hrefs).toEqual(['/export/settings.json']);
        click.mockRestore();
    });

    it('says when the export fails', async () => {
        const { button, tools } = await setup(
            makeSettings(),
            undefined,
            undefined,
            vi.fn(() => throwError(() => new Error('offline'))),
        );

        button('Export').click();

        expect(tools.alert).toHaveBeenCalledWith('There was an error exporting');
    });
});
