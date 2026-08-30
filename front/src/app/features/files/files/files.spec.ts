import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { NgModel } from '@angular/forms';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { FilesComponent } from './files';
import { FilesService } from '../../../core/files.service';
import { ToolsService } from '../../../core/tools.service';
import type { FileItem } from '../../../models/models';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let _seq = 1;

function makeFile(overrides: Partial<FileItem> = {}): FileItem {
    const n = _seq++;
    return {
        _id: `f${n}`,
        id: n,
        filename: `file${n}.jpg`,
        src: `/uploads/file${n}.jpg`,
        type: 'image/jpeg',
        size: 1000 + n,
        catalogues: [],
        created: 1_000_000 + n,
        ...overrides,
    };
}

function createMocks() {
    return {
        files: {
            getAllFiles: vi.fn().mockReturnValue(of([])),
            catalogues: signal<string[]>([]),
            setCatalogues: vi.fn(),
            edit: vi.fn().mockReturnValue(of({})),
            remove: vi.fn().mockReturnValue(of('ok')),
            upload: vi.fn().mockReturnValue(of()),
            importData: vi.fn().mockReturnValue(of([])),
            exportData: vi.fn().mockReturnValue(of('/export/files.json')),
        },
        tools: { alert: vi.fn(), confirm: vi.fn().mockReturnValue(of(true)) },
    };
}

function setup(files: FileItem[] = [], isPopup = false, mocks = createMocks()) {
    // no overrideComponent here: TestBed would recompile the component and the
    // instrumented files.html would never execute (0% template coverage)
    TestBed.configureTestingModule({
        imports: [FilesComponent, MatIconTestingModule],
        providers: [
            provideNoopAnimations(),
            { provide: FilesService, useValue: mocks.files },
            { provide: ToolsService, useValue: mocks.tools },
            { provide: MatDialogRef, useValue: { close: vi.fn() } },
        ],
    });

    const fixture: ComponentFixture<FilesComponent> = TestBed.createComponent(FilesComponent);
    fixture.componentRef.setInput('allFiles', files);
    fixture.componentRef.setInput('isPopup', isPopup);
    fixture.detectChanges();
    const comp = fixture.componentInstance as any;
    return { fixture, comp, mocks };
}

/** Synthetic `(change)` event for the hidden file inputs. */
function fileInputEvent(files: File[]): Event {
    return { target: { files, value: 'C:\\fake' } } as unknown as Event;
}

function buttonByText(fixture: ComponentFixture<FilesComponent>, text: string): HTMLButtonElement {
    const buttons: HTMLButtonElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('button'),
    );
    return buttons.find((b) => b.textContent?.trim() === text)!;
}

/** Scrolls one of the scrolling containers to the bottom — jsdom does no layout,
 *  so the scroll geometry has to be faked. `.files-grid-pane` scrolls on desktop,
 *  `.files-select` below 960px (see files.scss). */
function scrollToBottom(
    fixture: ComponentFixture<FilesComponent>,
    selector: '.files-grid-pane' | '.files-select' = '.files-grid-pane',
): void {
    const container: HTMLElement = fixture.nativeElement.querySelector(selector);
    for (const [prop, value] of Object.entries({
        scrollTop: 950,
        scrollHeight: 1100,
        clientHeight: 100,
    })) {
        Object.defineProperty(container, prop, { value, configurable: true });
    }
    container.dispatchEvent(new Event('scroll'));
}

/** NgModel directives inside a css scope, in template order. */
function ngModelsIn(fixture: ComponentFixture<FilesComponent>, scope: string): NgModel[] {
    return fixture.debugElement
        .query(By.css(scope))
        .queryAll(By.directive(NgModel))
        .map((d) => d.injector.get(NgModel));
}

beforeEach(() => {
    // jsdom does not implement object URLs
    (URL as { createObjectURL?: unknown }).createObjectURL = vi.fn(
        (f: File) => `blob:${f.name}`,
    );
    (URL as { revokeObjectURL?: unknown }).revokeObjectURL = vi.fn();
});

// ---------------------------------------------------------------------------
// ngOnInit / deriveCatalogues
// ---------------------------------------------------------------------------

describe('FilesComponent — init', () => {
    it('uses the resolved allFiles input outside popup mode', () => {
        const mocks = createMocks();
        const files = [makeFile(), makeFile()];
        const { comp } = setup(files, false, mocks);
        expect(comp.files()).toEqual(files);
        expect(mocks.files.getAllFiles).not.toHaveBeenCalled();
    });

    it('fetches all files from the service in popup mode', () => {
        const mocks = createMocks();
        const files = [makeFile()];
        mocks.files.getAllFiles.mockReturnValue(of(files));
        const { comp } = setup([], true, mocks);
        expect(mocks.files.getAllFiles).toHaveBeenCalled();
        expect(comp.files()).toEqual(files);
    });

    it('falls back to [] when the popup fetch returns null', () => {
        const mocks = createMocks();
        mocks.files.getAllFiles.mockReturnValue(of(null));
        const { comp } = setup([], true, mocks);
        expect(comp.files()).toEqual([]);
    });

    it('derives catalogues: lowercased file catalogues unioned with service ones, sorted', () => {
        const mocks = createMocks();
        mocks.files.catalogues = signal<string[]>(['base']);
        const files = [
            makeFile({ catalogues: ['Zeta'] }),
            makeFile({ catalogues: ['alpha', 'zeta'] }),
        ];
        const { comp } = setup(files, false, mocks);
        expect(comp.catalogues()).toEqual(['alpha', 'base', 'zeta']);
        expect(mocks.files.setCatalogues).toHaveBeenCalledWith(['alpha', 'base', 'zeta']);
    });
});

// ---------------------------------------------------------------------------
// filtered / visible / incrementLimit
// ---------------------------------------------------------------------------

describe('FilesComponent — filtering and paging', () => {
    it('filters by search text against the whole file JSON', () => {
        const apple = makeFile({ filename: 'apple.jpg' });
        const banana = makeFile({ filename: 'banana.jpg' });
        const { fixture, comp } = setup([apple, banana]);
        comp.searchText.set('banana');
        fixture.detectChanges();
        expect(comp.filtered()).toEqual([banana]);
    });

    it('filters by selected catalogues', () => {
        const inGallery = makeFile({ catalogues: ['gallery'] });
        const elsewhere = makeFile({ catalogues: ['banners'] });
        const none = makeFile({ catalogues: undefined });
        const { fixture, comp } = setup([inGallery, elsewhere, none]);
        comp.searchCatalogues.set(['gallery']);
        fixture.detectChanges();
        expect(comp.filtered()).toEqual([inGallery]);
    });

    it('visible respects the limit and incrementLimit raises it', () => {
        const files = Array.from({ length: 125 }, () => makeFile());
        const { comp } = setup(files);
        expect(comp.visible()).toHaveLength(120);
        comp.incrementLimit();
        expect(comp.visible()).toHaveLength(125);
    });

    it('incrementLimit does nothing when everything is already visible', () => {
        const { comp } = setup([makeFile()]);
        comp.incrementLimit();
        expect(comp.limit()).toBe(120);
    });

    it('moves the selection to the first match when the selected file is filtered out', () => {
        const apple = makeFile({ filename: 'apple.jpg' });
        const banana = makeFile({ filename: 'banana.jpg' });
        const { fixture, comp } = setup([apple, banana]);
        comp.select(apple);
        fixture.detectChanges();
        comp.searchText.set('banana');
        fixture.detectChanges();
        expect(comp.selected()).toBe(banana);
    });

    it('clears the selection when nothing matches the filter', () => {
        const apple = makeFile({ filename: 'apple.jpg' });
        const { fixture, comp } = setup([apple]);
        comp.select(apple);
        fixture.detectChanges();
        comp.searchText.set('no-such-file');
        fixture.detectChanges();
        expect(comp.selected()).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// select / chooseSelected / isImage
// ---------------------------------------------------------------------------

describe('FilesComponent — selection', () => {
    it('select stores the file and chooseSelected emits it', () => {
        const file = makeFile();
        const { fixture, comp } = setup([file]);
        const emitted: FileItem[] = [];
        comp.fileSelected.subscribe((f: FileItem) => emitted.push(f));
        comp.select(file);
        fixture.detectChanges();
        comp.chooseSelected();
        expect(emitted).toEqual([file]);
    });

    it('chooseSelected does nothing without a selection', () => {
        const { comp } = setup([]);
        const emitted: FileItem[] = [];
        comp.fileSelected.subscribe((f: FileItem) => emitted.push(f));
        comp.chooseSelected();
        expect(emitted).toEqual([]);
    });

    it('isImage treats everything except PDFs as an image', () => {
        const { comp } = setup([]);
        expect(comp.isImage(makeFile({ type: 'image/png' }))).toBe(true);
        expect(comp.isImage(makeFile({ type: 'application/pdf' }))).toBe(false);
        expect(comp.isImage(undefined)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// saveFile / deleteFile
// ---------------------------------------------------------------------------

describe('FilesComponent — saveFile()', () => {
    it('does nothing without a selection', () => {
        const mocks = createMocks();
        const { comp } = setup([], false, mocks);
        comp.saveFile();
        expect(mocks.files.edit).not.toHaveBeenCalled();
    });

    it('saves the selected file and re-derives catalogues', () => {
        const mocks = createMocks();
        const file = makeFile({ filename: 'photo.jpg' });
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();
        mocks.files.setCatalogues.mockClear();

        comp.saveFile();

        expect(mocks.files.edit).toHaveBeenCalledWith(file);
        expect(mocks.files.setCatalogues).toHaveBeenCalled();
        expect(mocks.tools.alert).toHaveBeenCalledWith(expect.stringContaining('photo.jpg'));
        expect(comp.actionStatus()).toBe('');
    });

    it('shows the server error message on failure', () => {
        const mocks = createMocks();
        mocks.files.edit.mockReturnValue(throwError(() => ({ error: { error: 'DB error' } })));
        const file = makeFile();
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();

        comp.saveFile();

        expect(mocks.tools.alert).toHaveBeenCalledWith('DB error');
        expect(comp.actionStatus()).toBe('');
    });

    it('falls back to a generic message when the error has no detail', () => {
        const mocks = createMocks();
        mocks.files.edit.mockReturnValue(throwError(() => ({})));
        const file = makeFile();
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();

        comp.saveFile();

        expect(mocks.tools.alert).toHaveBeenCalledWith('Error saving');
    });
});

describe('FilesComponent — deleteDialog() / deleteFile()', () => {
    it('asks for confirmation with the filename and does nothing on cancel', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(false));
        const file = makeFile({ filename: 'photo.jpg' });
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();

        comp.deleteDialog();

        expect(mocks.tools.confirm).toHaveBeenCalledWith(expect.stringContaining('photo.jpg'));
        expect(mocks.files.remove).not.toHaveBeenCalled();
    });

    it('does nothing without a selection', () => {
        const mocks = createMocks();
        const { comp } = setup([], false, mocks);
        comp.deleteDialog();
        expect(mocks.tools.confirm).not.toHaveBeenCalled();
    });

    it('removes the file from the list and clears the selection on success', () => {
        const mocks = createMocks();
        const file = makeFile({ _id: 'del1', filename: 'photo.jpg' });
        const other = makeFile();
        const { fixture, comp } = setup([file, other], false, mocks);
        comp.select(file);
        fixture.detectChanges();

        comp.deleteDialog();

        expect(mocks.files.remove).toHaveBeenCalledWith('del1');
        expect(comp.files()).toEqual([other]);
        expect(comp.selected()).toBeUndefined();
        expect(mocks.tools.alert).toHaveBeenCalledWith(expect.stringContaining('photo.jpg'));
    });

    it('shows the error message and keeps the file on failure', () => {
        const mocks = createMocks();
        mocks.files.remove.mockReturnValue(throwError(() => ({ error: 'Remove failed' })));
        const file = makeFile();
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();

        comp.deleteDialog();

        expect(mocks.tools.alert).toHaveBeenCalledWith('Remove failed');
        expect(comp.files()).toEqual([file]);
        expect(comp.actionStatus()).toBe('');
    });
});

// ---------------------------------------------------------------------------
// addCatalogue / addCataloguePending
// ---------------------------------------------------------------------------

describe('FilesComponent — addCatalogue()', () => {
    it('adds a trimmed, lowercased catalogue and keeps the list sorted', () => {
        const mocks = createMocks();
        const { comp } = setup([makeFile({ catalogues: ['gallery'] })], false, mocks);
        comp.newCatalogue.set('  Banners ');

        comp.addCatalogue();

        expect(comp.catalogues()).toEqual(['banners', 'gallery']);
        expect(comp.newCatalogue()).toBe('');
        expect(mocks.files.setCatalogues).toHaveBeenLastCalledWith(['banners', 'gallery']);
    });

    it('ignores duplicates and empty values', () => {
        const { comp } = setup([makeFile({ catalogues: ['gallery'] })]);
        comp.newCatalogue.set('gallery');
        comp.addCatalogue();
        comp.newCatalogue.set('   ');
        comp.addCatalogue();
        expect(comp.catalogues()).toEqual(['gallery']);
    });
});

describe('FilesComponent — addCataloguePending()', () => {
    function setupWithPending() {
        const result = setup([]);
        result.comp.onFilesSelect(
            fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]),
        );
        result.fixture.detectChanges();
        return result;
    }

    it('adds the catalogue and assigns it to the selected pending file', () => {
        const { comp } = setupWithPending();
        comp.newCataloguePending.set('Gallery');

        comp.addCataloguePending();

        expect(comp.catalogues()).toEqual(['gallery']);
        expect(comp.newCataloguePending()).toBe('');
        expect(comp.pending()[0].meta.catalogues).toEqual(['gallery']);
    });

    it('does not duplicate a catalogue already assigned to the pending file', () => {
        const { comp } = setupWithPending();
        comp.newCataloguePending.set('gallery');
        comp.addCataloguePending();
        comp.newCataloguePending.set('gallery');
        comp.addCataloguePending();
        expect(comp.pending()[0].meta.catalogues).toEqual(['gallery']);
    });

    it('does nothing for an empty value', () => {
        const { comp } = setupWithPending();
        comp.newCataloguePending.set('  ');
        comp.addCataloguePending();
        expect(comp.catalogues()).toEqual([]);
        expect(comp.pending()[0].meta.catalogues).toEqual([]);
    });

    it('still registers the catalogue when no pending file is selected', () => {
        const { comp } = setupWithPending();
        comp.selectedPending.set(null);
        comp.newCataloguePending.set('banners');
        comp.addCataloguePending();
        expect(comp.catalogues()).toEqual(['banners']);
        expect(comp.pending()[0].meta.catalogues).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// pending uploads: onFilesSelect / removePending / clearPending
// ---------------------------------------------------------------------------

describe('FilesComponent — pending files', () => {
    it('builds previews: object URLs for images, placeholder for PDFs', () => {
        const { comp } = setup([]);
        const img = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
        const pdf = new File(['y'], 'b.pdf', { type: 'application/pdf' });

        comp.onFilesSelect(fileInputEvent([img, pdf]));

        expect(comp.pending().map((p: { previewUrl: string }) => p.previewUrl)).toEqual([
            'blob:a.jpg',
            'images/pdf-placeholder.png',
        ]);
        expect(comp.selectedPending()).toBe(0);
        expect(comp.selectedPendingItem()?.file).toBe(img);
    });

    it('does nothing when the input has no files', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(fileInputEvent([]));
        expect(comp.pending()).toEqual([]);
        expect(comp.selectedPending()).toBeNull();
    });

    it('removePending revokes the object URL and shifts the selection down', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(
            fileInputEvent([
                new File(['1'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['2'], 'b.jpg', { type: 'image/jpeg' }),
            ]),
        );
        comp.selectPending(1);

        comp.removePending(0);

        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a.jpg');
        expect(comp.pending()).toHaveLength(1);
        expect(comp.selectedPending()).toBe(0);
    });

    it('removePending clamps the selection when the selected item is removed', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(
            fileInputEvent([
                new File(['1'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['2'], 'b.jpg', { type: 'image/jpeg' }),
            ]),
        );
        comp.selectPending(1);

        comp.removePending(1);

        expect(comp.selectedPending()).toBe(0);
        expect(comp.selectedPendingItem()?.file.name).toBe('a.jpg');
    });

    it('removePending resets the selection when the last item is removed', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(fileInputEvent([new File(['1'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.removePending(0);
        expect(comp.pending()).toEqual([]);
        expect(comp.selectedPending()).toBeNull();
    });

    it('clearPending revokes all object URLs and resets the state', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(
            fileInputEvent([
                new File(['1'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['2'], 'b.pdf', { type: 'application/pdf' }),
            ]),
        );

        comp.clearPending();

        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1); // only the blob: preview
        expect(comp.pending()).toEqual([]);
        expect(comp.selectedPending()).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// upload()
// ---------------------------------------------------------------------------

describe('FilesComponent — upload()', () => {
    function setupWithPending(mocks = createMocks()) {
        const result = setup([], false, mocks);
        result.comp.onFilesSelect(
            fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]),
        );
        result.fixture.detectChanges();
        return result;
    }

    it('does nothing when there are no pending files', () => {
        const mocks = createMocks();
        const { comp } = setup([], false, mocks);
        comp.upload();
        expect(mocks.files.upload).not.toHaveBeenCalled();
    });

    it('sends the files with their per-file metadata', () => {
        const mocks = createMocks();
        const { comp } = setupWithPending(mocks);
        comp.newCataloguePending.set('gallery');
        comp.addCataloguePending();

        comp.upload();

        const [files, filesData] = mocks.files.upload.mock.calls[0];
        expect(files.map((f: File) => f.name)).toEqual(['a.jpg']);
        expect(filesData['a.jpg'].catalogues).toEqual(['gallery']);
    });

    it('tracks upload progress events', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(
            of({ type: HttpEventType.UploadProgress, loaded: 50, total: 200 }),
        );
        const { comp } = setupWithPending(mocks);

        comp.upload();

        expect(comp.progress()).toBe(25);
    });

    it('appends uploaded files, clears pending and returns to the first tab', () => {
        const uploaded = [makeFile({ filename: 'a.jpg', catalogues: ['gallery'] })];
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(of(new HttpResponse({ body: uploaded })));
        const { fixture, comp } = setupWithPending(mocks);
        comp.tabs().selectedIndex = 1;
        fixture.detectChanges();

        comp.upload();

        expect(comp.files()).toEqual(uploaded);
        expect(comp.catalogues()).toEqual(['gallery']);
        expect(comp.pending()).toEqual([]);
        expect(comp.tabs().selectedIndex).toBe(0);
        expect(mocks.tools.alert).toHaveBeenCalledWith('Files uploaded successfully');
        expect(comp.actionStatus()).toBe('');
    });

    it('keeps the pending list when the response body is empty', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(of(new HttpResponse({ body: [] })));
        const { comp } = setupWithPending(mocks);

        comp.upload();

        expect(comp.pending()).toHaveLength(1);
        expect(mocks.tools.alert).not.toHaveBeenCalled();
    });

    it('shows the error message on upload failure', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(throwError(() => ({ error: { error: 'Too large' } })));
        const { comp } = setupWithPending(mocks);

        comp.upload();

        expect(mocks.tools.alert).toHaveBeenCalledWith('Too large');
        expect(comp.actionStatus()).toBe('');
    });
});

// ---------------------------------------------------------------------------
// import / export
// ---------------------------------------------------------------------------

describe('FilesComponent — onImportFile()', () => {
    it('does nothing when no file is selected', () => {
        const mocks = createMocks();
        const { comp } = setup([], false, mocks);
        comp.onImportFile({ target: { files: null } } as unknown as Event);
        expect(mocks.files.importData).not.toHaveBeenCalled();
    });

    it('shows an alert when the file is not valid JSON', async () => {
        const mocks = createMocks();
        const { comp } = setup([], false, mocks);
        comp.onImportFile(fileInputEvent([new File(['not json'], 'import.json')]));
        await new Promise((r) => setTimeout(r, 50));
        expect(mocks.tools.alert).toHaveBeenCalledWith('Wrong file format!');
    });

    it('shows an alert when the JSON has no files', async () => {
        const mocks = createMocks();
        const { comp } = setup([], false, mocks);
        comp.onImportFile(fileInputEvent([new File(['[]'], 'import.json')]));
        await new Promise((r) => setTimeout(r, 50));
        expect(mocks.tools.alert).toHaveBeenCalledWith('There is no correct files to import');
    });

    it('imports the files and reports how many were added', async () => {
        const existing = makeFile();
        const imported = [existing, makeFile(), makeFile()];
        const mocks = createMocks();
        mocks.files.importData.mockReturnValue(of(imported));
        const { comp } = setup([existing], false, mocks);

        const payload = JSON.stringify(imported);
        comp.onImportFile(fileInputEvent([new File([payload], 'import.json')]));
        await new Promise((r) => setTimeout(r, 50));

        expect(mocks.files.importData).toHaveBeenCalledWith({
            files: JSON.parse(payload),
        });
        expect(comp.files()).toEqual(imported);
        expect(mocks.tools.alert).toHaveBeenCalledWith(expect.stringContaining('2'));
        expect(comp.importStatus()).toBe(false);
    });

    it('shows the error message on import failure', async () => {
        const mocks = createMocks();
        mocks.files.importData.mockReturnValue(
            throwError(() => ({ error: { error: 'Import failed' } })),
        );
        const { comp } = setup([], false, mocks);

        comp.onImportFile(fileInputEvent([new File(['[{}]'], 'import.json')]));
        await new Promise((r) => setTimeout(r, 50));

        expect(mocks.tools.alert).toHaveBeenCalledWith('Import failed');
        expect(comp.importStatus()).toBe(false);
    });
});

describe('FilesComponent — export()', () => {
    // jsdom logs "Not implemented: navigation" when the download link is clicked
    afterEach(() => vi.restoreAllMocks());

    it('downloads the exported file path', () => {
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});
        const mocks = createMocks();
        const { comp } = setup([makeFile()], false, mocks);
        comp.export();
        expect(mocks.files.exportData).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(comp.exportStatus()).toBe(false);
    });

    it('shows an alert on export failure', () => {
        const mocks = createMocks();
        mocks.files.exportData.mockReturnValue(throwError(() => new Error('fail')));
        const { comp } = setup([makeFile()], false, mocks);
        comp.export();
        expect(mocks.tools.alert).toHaveBeenCalledWith('There was an error exporting');
        expect(comp.exportStatus()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// template smoke tests
// ---------------------------------------------------------------------------

describe('FilesComponent — template', () => {
    it('renders the grid with image thumbnails and the edit panel for the selection', () => {
        const image = makeFile({ filename: 'photo.jpg', src: '/uploads/photo.jpg' });
        const pdf = makeFile({ filename: 'doc.pdf', type: 'application/pdf' });
        const { fixture, comp } = setup([image, pdf]);
        comp.select(image);
        fixture.detectChanges();

        const thumbs: HTMLImageElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('.files-grid__item img'),
        );
        expect(thumbs.map((i) => i.getAttribute('src'))).toEqual([
            '/uploads/photo.jpg',
            'images/pdf-placeholder.png',
        ]);
        expect(fixture.nativeElement.querySelector('.files-edit__name').textContent).toContain(
            'photo.jpg',
        );

        // a selected PDF gets the placeholder preview in the edit panel
        comp.select(pdf);
        fixture.detectChanges();
        const preview = fixture.nativeElement.querySelector('.files-edit__preview img');
        expect(preview.getAttribute('src')).toBe('images/pdf-placeholder.png');
    });

    it('selects a file when its grid item is clicked', () => {
        const file = makeFile();
        const { fixture, comp } = setup([file]);
        const item: HTMLButtonElement =
            fixture.nativeElement.querySelector('.files-grid__item');
        item.click();
        fixture.detectChanges();
        expect(comp.selected()).toBe(file);
    });

    it('renders the upload tab with the pending list and meta form', () => {
        const { fixture, comp } = setup([]);
        comp.onFilesSelect(
            fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]),
        );
        comp.tabs().selectedIndex = 1;
        fixture.detectChanges();

        const pendingItem = fixture.nativeElement.querySelector('.upload-list-item');
        expect(pendingItem.textContent).toContain('a.jpg');
        expect(fixture.nativeElement.querySelector('.files-upload__edit')).not.toBeNull();
    });

    it('hides the header actions in popup mode and shows the close button', () => {
        const mocks = createMocks();
        mocks.files.getAllFiles.mockReturnValue(of([]));
        const { fixture } = setup([], true, mocks);
        expect(fixture.nativeElement.querySelector('.files-actions')).toBeNull();
        expect(fixture.nativeElement.querySelector('.files-popup-close')).not.toBeNull();
    });

    it('shows the empty state and skips meta rows for a file without metadata', () => {
        const bare = makeFile({
            created: undefined,
            src: undefined,
            type: undefined,
            size: undefined,
        });
        const { fixture, comp } = setup([bare]);
        comp.select(bare);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.files-edit__meta li')).toHaveLength(0);

        comp.files.set([]);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('There are no files yet');
    });
});

// ---------------------------------------------------------------------------
// files.html — event handler interactions (template listener coverage)
// ---------------------------------------------------------------------------

describe('files.html — event handlers', () => {
    it('search input and catalogue filter write back through ngModelChange', () => {
        const mocks = createMocks();
        mocks.files.catalogues = signal<string[]>(['gallery']);
        const { fixture, comp } = setup([makeFile()], false, mocks);

        const [search, catalogueFilter] = ngModelsIn(fixture, '.files-filters');
        search.viewToModelUpdate('abc');
        catalogueFilter.viewToModelUpdate(['gallery']);
        fixture.detectChanges();

        expect(comp.searchText()).toBe('abc');
        expect(comp.searchCatalogues()).toEqual(['gallery']);
    });

    it('edit panel inputs write back to the selected file', () => {
        const mocks = createMocks();
        mocks.files.catalogues = signal<string[]>(['gallery']);
        const file = makeFile();
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();

        // template order: title, description, author, place, position,
        // catalogues select, new-catalogue input
        const models = ngModelsIn(fixture, '.files-edit');
        models[0].viewToModelUpdate('New title');
        models[1].viewToModelUpdate('New description');
        models[2].viewToModelUpdate('New author');
        models[3].viewToModelUpdate('New place');
        models[4].viewToModelUpdate(7);
        models[5].viewToModelUpdate(['gallery']);
        models[6].viewToModelUpdate('prints');
        fixture.detectChanges();

        expect(file).toEqual(
            expect.objectContaining({
                title: 'New title',
                description: 'New description',
                author: 'New author',
                place: 'New place',
                position: 7,
                catalogues: ['gallery'],
            }),
        );
        expect(comp.newCatalogue()).toBe('prints');

        buttonByText(fixture, 'Add').click();
        fixture.detectChanges();
        expect(comp.catalogues()).toContain('prints');
    });

    it('header buttons trigger import and export', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup([makeFile()], false, mocks);

        const importInput: HTMLInputElement =
            fixture.nativeElement.querySelector('input[accept=".json"]');
        const importClick = vi.spyOn(importInput, 'click').mockImplementation(() => {});
        buttonByText(fixture, 'Import').click();
        expect(importClick).toHaveBeenCalled();

        // (change) with an empty real input is a covered no-op
        importInput.dispatchEvent(new Event('change'));
        expect(mocks.files.importData).not.toHaveBeenCalled();

        const exportSpy = vi.spyOn(comp, 'export').mockImplementation(() => {});
        buttonByText(fixture, 'Export').click();
        expect(exportSpy).toHaveBeenCalled();
        vi.restoreAllMocks();
    });

    it('Save and Delete buttons act on the selection', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(false));
        const file = makeFile();
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();

        buttonByText(fixture, 'Save').click();
        expect(mocks.files.edit).toHaveBeenCalledWith(file);

        buttonByText(fixture, 'Delete').click();
        expect(mocks.tools.confirm).toHaveBeenCalled();
    });

    it('Choose button emits the selected file in popup mode', () => {
        const mocks = createMocks();
        const file = makeFile();
        mocks.files.getAllFiles.mockReturnValue(of([file]));
        const { fixture, comp } = setup([], true, mocks);
        const emitted: FileItem[] = [];
        comp.fileSelected.subscribe((f: FileItem) => emitted.push(f));
        comp.select(file);
        fixture.detectChanges();

        buttonByText(fixture, 'Choose').click();
        expect(emitted).toEqual([file]);
    });

    it('upload tab buttons and pending meta inputs are wired up', async () => {
        const mocks = createMocks();
        mocks.files.catalogues = signal<string[]>(['gallery']);
        const { fixture, comp } = setup([], false, mocks);
        comp.tabs().selectedIndex = 1;
        fixture.detectChanges();
        // the tab body attaches its content in a follow-up CD pass
        await fixture.whenStable();
        fixture.detectChanges();

        const uploadInput: HTMLInputElement =
            fixture.nativeElement.querySelector('input[multiple]');
        const uploadClick = vi.spyOn(uploadInput, 'click').mockImplementation(() => {});
        buttonByText(fixture, 'Select files').click();
        expect(uploadClick).toHaveBeenCalled();

        // (change) with an empty real input is a covered no-op
        uploadInput.dispatchEvent(new Event('change'));
        expect(comp.pending()).toEqual([]);

        comp.onFilesSelect(
            fileInputEvent([
                new File(['1'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['2'], 'b.jpg', { type: 'image/jpeg' }),
            ]),
        );
        fixture.detectChanges();

        // pick the second pending file from the list
        const items: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('.upload-list-item'),
        );
        items[1].click();
        fixture.detectChanges();
        expect(comp.selectedPending()).toBe(1);

        // meta inputs write back to the selected pending file
        const models = ngModelsIn(fixture, '.files-upload__edit');
        models[0].viewToModelUpdate('T');
        models[1].viewToModelUpdate('D');
        models[2].viewToModelUpdate('A');
        models[3].viewToModelUpdate('P');
        models[4].viewToModelUpdate(3);
        models[5].viewToModelUpdate(['gallery']);
        models[6].viewToModelUpdate('prints');
        fixture.detectChanges();
        expect(comp.pending()[1].meta).toEqual(
            expect.objectContaining({ title: 'T', description: 'D', author: 'A', place: 'P', position: 3 }),
        );
        expect(comp.newCataloguePending()).toBe('prints');

        buttonByText(fixture, 'Add').click();
        fixture.detectChanges();
        expect(comp.pending()[1].meta.catalogues).toContain('prints');

        // remove the selected pending file via its Delete button
        const editAside = fixture.debugElement.query(By.css('.files-upload__edit'));
        (editAside.nativeElement.querySelector('button') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(comp.pending()).toHaveLength(1);

        buttonByText(fixture, 'Upload').click();
        expect(mocks.files.upload).toHaveBeenCalled();

        buttonByText(fixture, 'Delete files').click();
        fixture.detectChanges();
        expect(comp.pending()).toEqual([]);
        vi.restoreAllMocks();
    });

    it('shows the progress bar while an upload is in flight', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(
            of({ type: HttpEventType.UploadProgress, loaded: 50, total: 200 }),
        );
        const { fixture, comp } = setup([], false, mocks);
        comp.onFilesSelect(fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.tabs().selectedIndex = 1;
        fixture.detectChanges();

        buttonByText(fixture, 'Upload').click();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('mat-progress-bar')).not.toBeNull();
    });

    it('hides the pending edit panel when no pending file is selected', async () => {
        const { fixture, comp } = setup([]);
        comp.onFilesSelect(fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.selectedPending.set(null);
        comp.tabs().selectedIndex = 1;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.upload-list-item')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('.files-upload__edit')).toBeNull();
    });

    it('scrolling the grid pane loads more files', () => {
        const files = Array.from({ length: 125 }, () => makeFile());
        const { fixture, comp } = setup(files);

        expect(comp.visible()).toHaveLength(120);
        scrollToBottom(fixture);
        fixture.detectChanges();
        expect(comp.visible()).toHaveLength(125);
    });

    it('scrolling the select pane loads more files (mobile scroll container)', () => {
        const files = Array.from({ length: 125 }, () => makeFile());
        const { fixture, comp } = setup(files);

        expect(comp.visible()).toHaveLength(120);
        scrollToBottom(fixture, '.files-select');
        fixture.detectChanges();
        expect(comp.visible()).toHaveLength(125);
    });

    it('scrolling the grid pane does nothing when all files are visible (enabled = false)', () => {
        const { fixture, comp } = setup([makeFile()]);
        const spy = vi.spyOn(comp, 'incrementLimit');

        scrollToBottom(fixture);
        fixture.detectChanges();

        expect(spy).not.toHaveBeenCalled();
        expect(comp.visible()).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// remaining branch coverage
// ---------------------------------------------------------------------------

describe('FilesComponent — remaining branches', () => {
    it('selectedPendingItem is undefined when nothing is selected', () => {
        const { comp } = setup([]);
        expect(comp.selectedPendingItem()).toBeUndefined();
    });

    it('falls back to [] when the allFiles input is null', () => {
        const { comp } = setup(null as unknown as FileItem[]);
        expect(comp.files()).toEqual([]);
    });

    it('onFilesSelect tolerates a missing FileList', () => {
        const { comp } = setup([]);
        comp.onFilesSelect({ target: { files: null, value: '' } } as unknown as Event);
        expect(comp.pending()).toEqual([]);
    });

    it('addCataloguePending initialises missing meta.catalogues', () => {
        const { comp } = setup([]);
        comp.pending.set([{ file: new File(['x'], 'a.jpg'), previewUrl: 'p', meta: {} }]);
        comp.selectedPending.set(0);
        comp.newCataloguePending.set('gallery');
        comp.addCataloguePending();
        expect(comp.pending()[0].meta.catalogues).toEqual(['gallery']);
    });

    it('delete error prefers the nested server message', () => {
        const mocks = createMocks();
        mocks.files.remove.mockReturnValue(throwError(() => ({ error: { error: 'Nested' } })));
        const file = makeFile();
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();
        comp.deleteDialog();
        expect(mocks.tools.alert).toHaveBeenCalledWith('Nested');
    });

    it('delete error falls back to the generic message', () => {
        const mocks = createMocks();
        mocks.files.remove.mockReturnValue(throwError(() => ({})));
        const file = makeFile();
        const { fixture, comp } = setup([file], false, mocks);
        comp.select(file);
        fixture.detectChanges();
        comp.deleteDialog();
        expect(mocks.tools.alert).toHaveBeenCalledWith('Error removing');
    });

    it('removePending ignores an unknown index', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(fileInputEvent([new File(['1'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.removePending(5);
        expect(comp.pending()).toHaveLength(1);
        expect(comp.selectedPending()).toBe(0);
    });

    it('removePending keeps a null selection', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(
            fileInputEvent([
                new File(['1'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['2'], 'b.jpg', { type: 'image/jpeg' }),
            ]),
        );
        comp.selectedPending.set(null);
        comp.removePending(0);
        expect(comp.pending()).toHaveLength(1);
        expect(comp.selectedPending()).toBeNull();
    });

    it('removePending keeps the selection when a later item is removed', () => {
        const { comp } = setup([]);
        comp.onFilesSelect(
            fileInputEvent([
                new File(['1'], 'a.jpg', { type: 'image/jpeg' }),
                new File(['2'], 'b.jpg', { type: 'image/jpeg' }),
            ]),
        );
        comp.selectPending(0);
        comp.removePending(1);
        expect(comp.selectedPending()).toBe(0);
        expect(comp.selectedPendingItem()?.file.name).toBe('a.jpg');
    });

    it('ignores upload progress events without a total', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(
            of({ type: HttpEventType.UploadProgress, loaded: 10 }),
        );
        const { comp } = setup([], false, mocks);
        comp.onFilesSelect(fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.upload();
        expect(comp.progress()).toBe(0);
    });

    it('treats a response without a body as no uploads', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(of(new HttpResponse<FileItem[]>({})));
        const { comp } = setup([], false, mocks);
        comp.onFilesSelect(fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.upload();
        expect(comp.pending()).toHaveLength(1);
        expect(comp.files()).toEqual([]);
    });

    it('ignores other upload event types', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(of({ type: HttpEventType.Sent }));
        const { comp } = setup([], false, mocks);
        comp.onFilesSelect(fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.upload();
        expect(comp.progress()).toBe(0);
        expect(comp.files()).toEqual([]);
    });

    it('upload error prefers the plain error string', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(throwError(() => ({ error: 'Plain' })));
        const { comp } = setup([], false, mocks);
        comp.onFilesSelect(fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.upload();
        expect(mocks.tools.alert).toHaveBeenCalledWith('Plain');
    });

    it('upload error falls back to the generic message', () => {
        const mocks = createMocks();
        mocks.files.upload.mockReturnValue(throwError(() => ({})));
        const { comp } = setup([], false, mocks);
        comp.onFilesSelect(fileInputEvent([new File(['x'], 'a.jpg', { type: 'image/jpeg' })]));
        comp.upload();
        expect(mocks.tools.alert).toHaveBeenCalledWith('Error uploading');
    });

    it('reports "was" when exactly one file is imported', async () => {
        const existing = makeFile();
        const mocks = createMocks();
        mocks.files.importData.mockReturnValue(of([existing, makeFile()]));
        const { comp } = setup([existing], false, mocks);

        comp.onImportFile(fileInputEvent([new File(['[{}]'], 'import.json')]));
        await new Promise((r) => setTimeout(r, 50));

        expect(mocks.tools.alert).toHaveBeenCalledWith(expect.stringContaining('was'));
    });

    it('import error falls back to the generic message', async () => {
        const mocks = createMocks();
        mocks.files.importData.mockReturnValue(throwError(() => ({})));
        const { comp } = setup([], false, mocks);

        comp.onImportFile(fileInputEvent([new File(['[{}]'], 'import.json')]));
        await new Promise((r) => setTimeout(r, 50));

        expect(mocks.tools.alert).toHaveBeenCalledWith('There was an error importing');
    });
});
