import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentsService } from './components.service';
import type { ComponentEntity } from '../models/models';

const makeComponent = (overrides: Partial<ComponentEntity> = {}): ComponentEntity => ({
    _id: 'c1', id: 1, title: 'Hero', type: 'hero', fields: [], ...overrides,
});

describe('ComponentsService', () => {
    let service: ComponentsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ComponentsService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(ComponentsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('create() sends POST /api/component', () => {
        const comp = makeComponent();
        let result: ComponentEntity | undefined;
        service.create(comp).subscribe((r) => (result = r));
        http.expectOne({ method: 'POST', url: '/api/component' }).flush(comp);
        expect(result).toEqual(comp);
    });

    it('edit() sends PUT /api/component/edit', () => {
        const comp = makeComponent({ title: 'Updated' });
        let result: ComponentEntity | undefined;
        service.edit(comp).subscribe((r) => (result = r));
        http.expectOne({ method: 'PUT', url: '/api/component/edit' }).flush(comp);
        expect(result).toEqual(comp);
    });

    it('getAll() sends GET /api/component', () => {
        let result: ComponentEntity[] | undefined;
        service.getAll().subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/component' }).flush([makeComponent()]);
        expect(result).toHaveLength(1);
    });

    it('getById() sends GET /api/component/:id', () => {
        let result: ComponentEntity | undefined;
        service.getById(5).subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/component/5' }).flush(makeComponent({ id: 5 }));
        expect(result?.id).toBe(5);
    });

    it('remove() sends DELETE /api/component/:id with responseType text', () => {
        let result: string | undefined;
        service.remove('c1').subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'DELETE', url: '/api/component/c1' });
        expect(req.request.responseType).toBe('text');
        req.flush('ok');
        expect(result).toBe('ok');
    });

    it('exportData() sends GET /api/exportComponents with responseType text', () => {
        let result: string | undefined;
        service.exportData().subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'GET', url: '/api/exportComponents' });
        expect(req.request.responseType).toBe('text');
        req.flush('/export/components.json');
        expect(result).toBe('/export/components.json');
    });

    it('importData() sends POST /api/importComponents with the body', () => {
        const comps = [makeComponent()];
        service.importData({ posts: comps }).subscribe();
        const req = http.expectOne({ method: 'POST', url: '/api/importComponents' });
        expect(req.request.body).toEqual({ posts: comps });
        req.flush(comps);
    });
});
