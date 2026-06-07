import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PagesService } from './pages.service';
import type { Page } from '../models/models';

const makePage = (overrides: Partial<Page> = {}): Page => ({
    _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [], ...overrides,
});

describe('PagesService', () => {
    let service: PagesService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PagesService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(PagesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('create() sends POST /api/page', () => {
        const page = makePage();
        let result: Page | undefined;
        service.create(page).subscribe((r) => (result = r));
        http.expectOne({ method: 'POST', url: '/api/page' }).flush(page);
        expect(result).toEqual(page);
    });

    it('edit() sends PUT /api/page/edit', () => {
        const page = makePage({ title: 'Updated' });
        let result: Page | undefined;
        service.edit(page).subscribe((r) => (result = r));
        http.expectOne({ method: 'PUT', url: '/api/page/edit' }).flush(page);
        expect(result).toEqual(page);
    });

    it('getAll() sends GET /api/page', () => {
        let result: Page[] | undefined;
        service.getAll().subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/page' }).flush([makePage()]);
        expect(result).toHaveLength(1);
    });

    it('getById() sends GET /api/page/:id', () => {
        let result: Page | undefined;
        service.getById(3).subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/page/3' }).flush(makePage({ id: 3 }));
        expect(result?.id).toBe(3);
    });

    it('remove() sends DELETE /api/page/:id with responseType text', () => {
        let result: string | undefined;
        service.remove('p1').subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'DELETE', url: '/api/page/p1' });
        expect(req.request.responseType).toBe('text');
        req.flush('ok');
        expect(result).toBe('ok');
    });

    it('exportData() sends GET /api/exportPages with responseType text', () => {
        let result: string | undefined;
        service.exportData().subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'GET', url: '/api/exportPages' });
        expect(req.request.responseType).toBe('text');
        req.flush('/export/pages.json');
        expect(result).toBe('/export/pages.json');
    });

    it('importData() sends POST /api/importPages with the body', () => {
        const pages = [makePage()];
        service.importData({ posts: pages }).subscribe();
        const req = http.expectOne({ method: 'POST', url: '/api/importPages' });
        expect(req.request.body).toEqual({ posts: pages });
        req.flush(pages);
    });
});
