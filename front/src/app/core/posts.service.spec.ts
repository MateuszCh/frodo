import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PostsService } from './posts.service';
import { makePost } from '../testing/test-helpers';
import type { Post } from '../models/models';

describe('PostsService', () => {
    let service: PostsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PostsService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(PostsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('create() sends POST /api/post and returns the created post', () => {
        const post = makePost();
        const created = { ...post, _id: 'server-id' };
        let result: Post | undefined;
        service.create(post).subscribe((r) => (result = r));
        http.expectOne({ method: 'POST', url: '/api/post' }).flush(created);
        expect(result).toEqual(created);
    });

    it('edit() sends PUT /api/post/edit and returns the updated post', () => {
        const post = makePost({ title: 'Updated' });
        let result: Post | undefined;
        service.edit(post).subscribe((r) => (result = r));
        http.expectOne({ method: 'PUT', url: '/api/post/edit' }).flush(post);
        expect(result).toEqual(post);
    });

    it('getById() sends GET /api/post/:id and returns the post', () => {
        const post = makePost();
        let result: Post | undefined;
        service.getById(5).subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/post/5' }).flush(post);
        expect(result).toEqual(post);
    });

    it('remove() sends DELETE /api/post/:id and returns a string', () => {
        let result: string | undefined;
        service.remove('abc').subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'DELETE', url: '/api/post/abc' });
        expect(req.request.responseType).toBe('text');
        req.flush('ok');
        expect(result).toBe('ok');
    });

    it('exportData() sends GET /api/exportPosts/:postType with responseType text', () => {
        let result: string | undefined;
        service.exportData('articles').subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'GET', url: '/api/exportPosts/articles' });
        expect(req.request.responseType).toBe('text');
        req.flush('/export/articles.json');
        expect(result).toBe('/export/articles.json');
    });

    it('importData() sends POST /api/importPosts with the body', () => {
        const body = { postType: 'articles', posts: [makePost()] };
        service.importData(body).subscribe();
        const req = http.expectOne({ method: 'POST', url: '/api/importPosts' });
        expect(req.request.body).toEqual(body);
        req.flush({});
    });
});
