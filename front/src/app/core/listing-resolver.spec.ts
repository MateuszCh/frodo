import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { listingResolver, parsePage } from './resolvers';
import { ListingService } from './listing.service';

function route(family: string, params: Record<string, string> = {}, query: Record<string, string> = {}) {
    return {
        data: { family },
        paramMap: convertToParamMap(params),
        queryParamMap: convertToParamMap(query),
    } as unknown as ActivatedRouteSnapshot;
}

describe('listingResolver', () => {
    const query = vi.fn().mockReturnValue(of({ items: [] }));

    beforeEach(() => {
        // other spec files in the same worker may leave a sort or page size behind
        sessionStorage.clear();
        localStorage.removeItem('listing.pageSize.pages');
        query.mockClear();
        TestBed.configureTestingModule({ providers: [{ provide: ListingService, useValue: { query } }] });
    });
    afterEach(() => {
        localStorage.removeItem('listing.pageSize.pages');
        localStorage.removeItem('listing.pageSize.posts.news');
        sessionStorage.clear();
    });

    const resolve = (r: ActivatedRouteSnapshot) =>
        TestBed.runInInjectionContext(() => (listingResolver(r, {} as never) as ReturnType<typeof of>).subscribe());

    it('loads the page in the URL with the default size and sort', () => {
        resolve(route('pages', {}, { page: '3' }));
        expect(query).toHaveBeenCalledWith('pages', { postType: undefined, page: 3, limit: 20, sort: 'created' });
    });

    it('uses the page size and sort kept for the listing', () => {
        localStorage.setItem('listing.pageSize.posts.news', '50');
        sessionStorage.setItem('sorting.posts.news', '-title');
        resolve(route('posts', { type: 'news' }));
        expect(query).toHaveBeenCalledWith('posts', { postType: 'news', page: 1, limit: 50, sort: '-title' });
    });
});

describe('parsePage', () => {
    it('takes whole numbers from 1 up, anything else is page 1', () => {
        expect(parsePage('4')).toBe(4);
        expect(parsePage(2)).toBe(2);
        expect(parsePage('0')).toBe(1);
        expect(parsePage('-1')).toBe(1);
        expect(parsePage('1.5')).toBe(1);
        expect(parsePage('abc')).toBe(1);
        expect(parsePage(null)).toBe(1);
        expect(parsePage(undefined)).toBe(1);
    });
});
