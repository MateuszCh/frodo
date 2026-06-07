import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PostTypesService } from './post-types.service';
import { makePostType } from '../testing/test-helpers';
import type { PostType } from '../models/models';

describe('PostTypesService', () => {
    let service: PostTypesService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PostTypesService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(PostTypesService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    // ---- menu signal ---------------------------------------------------------

    it('menu signal starts as an empty array', () => {
        expect(service.menu()).toEqual([]);
    });

    it('getAll() updates the menu signal', () => {
        const types = [makePostType()];
        service.getAll().subscribe();
        http.expectOne('/api/postType').flush(types);
        expect(service.menu()).toHaveLength(1);
    });

    it('refreshMenu() calls getAll() and updates the menu signal', () => {
        const types = [makePostType(), makePostType()];
        service.refreshMenu();
        http.expectOne({ method: 'GET', url: '/api/postType' }).flush(types);
        expect(service.menu()).toHaveLength(2);
    });

    it('getAll() handles null response gracefully', () => {
        service.getAll().subscribe();
        http.expectOne('/api/postType').flush(null);
        expect(service.menu()).toEqual([]);
    });

    it('refreshMenu() handles null response gracefully', () => {
        service.refreshMenu();
        http.expectOne('/api/postType').flush(null);
        expect(service.menu()).toEqual([]);
    });

    // ---- CRUD ----------------------------------------------------------------

    it('create() sends POST /api/postType', () => {
        const pt = makePostType();
        let result: PostType | undefined;
        service.create(pt).subscribe((r) => (result = r));
        http.expectOne({ method: 'POST', url: '/api/postType' }).flush(pt);
        expect(result).toEqual(pt);
    });

    it('edit() sends PUT /api/postType/edit and returns the updated post type', () => {
        const pt = makePostType({ title: 'Updated' });
        let result: PostType | undefined;
        service.edit(pt).subscribe((r) => (result = r));
        http.expectOne({ method: 'PUT', url: '/api/postType/edit' }).flush(pt);
        expect(result).toEqual(pt);
    });

    it('getById() sends GET /api/postType/:id and returns the post type', () => {
        const pt = makePostType();
        let result: PostType | undefined;
        service.getById(1).subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/postType/1' }).flush(pt);
        expect(result).toEqual(pt);
    });

    it('getByIdWithPosts() sends GET /api/postTypePosts/:id and returns the post type', () => {
        const pt = makePostType();
        let result: PostType | undefined;
        service.getByIdWithPosts(2).subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/postTypePosts/2' }).flush(pt);
        expect(result).toEqual(pt);
    });

    it('getByType() sends GET /api/postTypeByType/:type and returns the post type', () => {
        const pt = makePostType();
        let result: PostType | undefined;
        service.getByType('articles').subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/postTypeByType/articles' }).flush(pt);
        expect(result).toEqual(pt);
    });

    it('getByTypeWithPosts() sends GET /api/postTypeByTypePosts/:type and returns the post type', () => {
        const pt = makePostType();
        let result: PostType | undefined;
        service.getByTypeWithPosts('news').subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/postTypeByTypePosts/news' }).flush(pt);
        expect(result).toEqual(pt);
    });

    it('remove() sends DELETE /api/postType/:id with responseType text', () => {
        let result: string | undefined;
        service.remove('pt1').subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'DELETE', url: '/api/postType/pt1' });
        expect(req.request.responseType).toBe('text');
        req.flush('ok');
        expect(result).toBe('ok');
    });

    it('exportData() sends GET /api/exportPostTypes with responseType text', () => {
        service.exportData().subscribe();
        const req = http.expectOne({ method: 'GET', url: '/api/exportPostTypes' });
        expect(req.request.responseType).toBe('text');
        req.flush('/export/post-types.json');
    });

    it('importData() sends POST /api/importPostTypes', () => {
        const data = { posts: [makePostType()] };
        service.importData(data).subscribe();
        const req = http.expectOne({ method: 'POST', url: '/api/importPostTypes' });
        expect(req.request.body).toEqual(data);
        req.flush([]);
    });
});
