import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FilesService } from './files.service';
import type { FileItem } from '../models/models';

const makeFileItem = (overrides: Partial<FileItem> = {}): FileItem => ({
    _id: 'f1', id: 1, filename: 'photo.jpg', ...overrides,
});

describe('FilesService', () => {
    let service: FilesService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [FilesService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(FilesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    // ---- catalogues signal ---------------------------------------------------

    it('catalogues signal starts as an empty array', () => {
        expect(service.catalogues()).toEqual([]);
    });

    it('loadCatalogues() updates the catalogues signal', () => {
        service.loadCatalogues().subscribe();
        http.expectOne('/api/file/catalogues').flush(['nature', 'tech']);
        expect(service.catalogues()).toEqual(['nature', 'tech']);
    });

    it('loadCatalogues() handles null response gracefully', () => {
        service.loadCatalogues().subscribe();
        http.expectOne('/api/file/catalogues').flush(null);
        expect(service.catalogues()).toEqual([]);
    });

    it('setCatalogues() updates the catalogues signal directly', () => {
        service.setCatalogues(['sport', 'travel']);
        expect(service.catalogues()).toEqual(['sport', 'travel']);
    });

    it('setCatalogues() handles null gracefully', () => {
        service.setCatalogues(null as unknown as string[]);
        expect(service.catalogues()).toEqual([]);
    });

    // ---- HTTP methods --------------------------------------------------------

    it('getAllFiles() sends GET /api/file', () => {
        let result: FileItem[] | undefined;
        service.getAllFiles().subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/file' }).flush([makeFileItem()]);
        expect(result).toHaveLength(1);
    });

    it('getByCatalogue() sends GET /api/file/:catalogue', () => {
        let result: FileItem[] | undefined;
        service.getByCatalogue('nature').subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/file/nature' }).flush([makeFileItem()]);
        expect(result).toHaveLength(1);
    });

    it('edit() sends PUT /api/file', () => {
        const file = makeFileItem({ title: 'Updated' });
        let result: FileItem | undefined;
        service.edit(file).subscribe((r) => (result = r));
        http.expectOne({ method: 'PUT', url: '/api/file' }).flush(file);
        expect(result?.title).toBe('Updated');
    });

    it('remove() sends DELETE /api/file/:id with responseType text', () => {
        let result: string | undefined;
        service.remove('f1').subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'DELETE', url: '/api/file/f1' });
        expect(req.request.responseType).toBe('text');
        req.flush('ok');
        expect(result).toBe('ok');
    });

    it('exportData() sends GET /api/exportFiles with responseType text', () => {
        service.exportData().subscribe();
        const req = http.expectOne({ method: 'GET', url: '/api/exportFiles' });
        expect(req.request.responseType).toBe('text');
        req.flush('/export/files.json');
    });

    it('importData() sends POST /api/importFiles', () => {
        const data = { files: [makeFileItem()] };
        service.importData(data).subscribe();
        const req = http.expectOne({ method: 'POST', url: '/api/importFiles' });
        expect(req.request.body).toEqual(data);
        req.flush([]);
    });

    // ---- upload() ------------------------------------------------------------

    it('upload() sends POST /api/file as multipart FormData', () => {
        const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
        service.upload([file]).subscribe();
        const req = http.expectOne({ method: 'POST', url: '/api/file' });
        expect(req.request.body).toBeInstanceOf(FormData);
        expect(req.request.reportProgress).toBe(true);
        expect(req.request.withCredentials).toBe(true);
        req.flush([]);
    });

    it('upload() appends per-file metadata to FormData', () => {
        const file = new File(['data'], 'img.jpg', { type: 'image/jpeg' });
        const filesData = { 'img.jpg': { title: 'My Photo', catalogues: ['nature'] } };
        service.upload([file], filesData).subscribe();
        const req = http.expectOne('/api/file');
        const form = req.request.body as FormData;
        expect(form.get('filesData[img.jpg][title]')).toBe('My Photo');
        req.flush([]);
    });
});
