import { Component, NO_ERRORS_SCHEMA, input, output, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { ListingComponent } from './listing';
import { ListingFiltersComponent } from '../listing-filters/listing-filters';

import { LayoutService } from '../../../core/layout.service';
import { ToolsService } from '../../../core/tools.service';
import { PagesService } from '../../../core/pages.service';
import { PostsService } from '../../../core/posts.service';
import { PostTypesService } from '../../../core/post-types.service';
import { ComponentsService } from '../../../core/components.service';
import { FilesService } from '../../../core/files.service';
import { ListingPage, ListingService } from '../../../core/listing.service';
import { LoadingService } from '../../../core/loading.service';
import { makePost, makePostType } from '../../../testing/test-helpers';
import type { Page, Post, PostType } from '../../../models/models';

import type { Filters } from '../listing-filter';

// These tests assert the English texts; the Polish default is covered in i18n.service.spec.ts
// and in the Polish rendering tests.
beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

// ---------------------------------------------------------------------------
// Minimal stubs — inputs/outputs must match originals so template bindings resolve.
// ---------------------------------------------------------------------------

@Component({ selector: 'app-listing-filters', standalone: true, template: '' })
class StubListingFilters {
    readonly filters = input<Filters>();
    readonly type = input<string>('');
    readonly changed = output<void>();
}

/** A server page of a listing; `items` need an `_id`. */
function listingPage(items: object[] = [], extra: Partial<ListingPage> = {}): ListingPage {
    return {
        items: items as ListingPage['items'],
        page: 1,
        limit: 20,
        matched: items.length,
        total: items.length,
        ...extra,
    };
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

const EXPORT_ROWS = [
    { _id: 'a1', title: 'First' },
    { _id: 'b2', title: 'Second' },
    { _id: 'c3', title: 'Third' },
];
const chosen: { ids?: string[] } = {};
beforeEach(() => (chosen.ids = EXPORT_ROWS.map((row) => row._id)));

function createMocks() {
    return {
        tools: { confirm: vi.fn().mockReturnValue(of(true)), alert: vi.fn() },
        layout: { size: signal<string>('size-x'), scrollToTop: vi.fn() },
        pages: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of({ imported: 0 })) },
        posts: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of({ imported: 0 })) },
        postTypes: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of({ imported: 0 })), refreshMenu: vi.fn() },
        components: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of({ imported: 0 })) },
        files: { catalogues: signal<string[]>([]) },
        listing: {
            query: vi.fn().mockReturnValue(of(listingPage())),
            all: vi.fn().mockReturnValue(of(EXPORT_ROWS)),
        },
        // the export dialog: closes with what `chosen` holds (undefined: Cancel)
        dialog: { open: vi.fn((..._args: unknown[]) => ({ afterClosed: () => of(chosen.ids) })) },
        loader: { track: vi.fn((source: unknown) => source) },
    };
}

function setup(mocks = createMocks()) {
    TestBed.configureTestingModule({
        imports: [ListingComponent, MatIconTestingModule],
        schemas: [NO_ERRORS_SCHEMA],
        providers: [
            provideRouter([]),
            provideLocationMocks(),
            provideNoopAnimations(),
            { provide: ToolsService, useValue: mocks.tools },
            { provide: LayoutService, useValue: mocks.layout },
            { provide: PagesService, useValue: mocks.pages },
            { provide: PostsService, useValue: mocks.posts },
            { provide: PostTypesService, useValue: mocks.postTypes },
            { provide: ComponentsService, useValue: mocks.components },
            { provide: FilesService, useValue: mocks.files },
            { provide: ListingService, useValue: mocks.listing },
            { provide: LoadingService, useValue: mocks.loader },
            { provide: MatDialog, useValue: mocks.dialog },
        ],
    }).overrideComponent(ListingComponent, {
        remove: { imports: [ListingFiltersComponent] },
        add: { imports: [StubListingFilters] },
    });

    const fixture: ComponentFixture<ListingComponent> = TestBed.createComponent(ListingComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance as any;
    return { fixture, comp, mocks, router: TestBed.inject(Router) };
}

/** Shows `items` (as served by the server) in a listing of `family`. */
function serve(mocks: ReturnType<typeof createMocks>, items: object[], extra: Partial<ListingPage> = {}) {
    mocks.listing.query.mockReturnValue(of(listingPage(items, extra)));
}

// ---------------------------------------------------------------------------
// computed signals: isPosts / title
// ---------------------------------------------------------------------------

describe('ListingComponent — isPosts / title', () => {
    it('isPosts is true when family is "posts"', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ pluralTitle: 'Articles' }));
        fixture.detectChanges();
        expect(comp.isPosts()).toBe(true);
    });

    it('isPosts is false for other families', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        expect(comp.isPosts()).toBe(false);
    });

    it('title returns "pages" for pages family', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        expect(comp.title()).toBe('pages');
    });

    it('title returns "post types" for postTypes family', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        expect(comp.title()).toBe('post types');
    });

    it('title returns pluralTitle for posts family', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ pluralTitle: 'Articles' }));
        fixture.detectChanges();
        expect(comp.title()).toBe('Articles');
    });

    it('title falls back to "" when pluralTitle is undefined', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'posts');
        // makePostType without explicit pluralTitle leaves it as the default 'Test Types',
        // so override to undefined
        fixture.componentRef.setInput('model', makePostType({ pluralTitle: undefined as unknown as string }));
        fixture.detectChanges();
        expect(comp.title()).toBe('');
    });

    it('postType and postTypeId computeds return undefined for non-posts family', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        expect((comp as any).postType()).toBeUndefined();
        expect((comp as any).postTypeId()).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// loading pages from the server
// ---------------------------------------------------------------------------

describe('ListingComponent — server pages', () => {
    afterEach(() => {
        sessionStorage.clear();
        localStorage.removeItem('listing.pageSize.pages');
        localStorage.removeItem('listing.pageSize.posts.news');
    });

    function pages(n: number): Page[] {
        return Array.from({ length: n }, (_, i) => ({ _id: `p${i}`, id: i, title: `Page ${i}`, pageUrl: `/${i}`, rows: [] }));
    }

    it('requests the first page of 20, sorted by the default sort', () => {
        const mocks = createMocks();
        const { fixture } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenLastCalledWith('pages', {
            postType: undefined,
            page: 1,
            limit: 20,
            sort: 'created',
            q: undefined,
            filters: null,
        });
    });

    it('shows the served items and counts', () => {
        const mocks = createMocks();
        serve(mocks, pages(2), { matched: 42, total: 50 });
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        expect(comp.items()).toHaveLength(2);
        expect(comp.matchCount()).toBe(42);
        expect(comp.count()).toBe(50);
        expect(comp.loaded()).toBe(true);
    });

    it('shows the page resolved by the route at once, without asking again', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('page', '2');
        fixture.componentRef.setInput('listing', listingPage(pages(3), { page: 2, matched: 23, total: 23 }));
        fixture.detectChanges();
        expect(mocks.listing.query).not.toHaveBeenCalled();
        expect(comp.items()).toHaveLength(3);
        expect(comp.matchCount()).toBe(23);
        expect(comp.loaded()).toBe(true);

        // the next page is loaded by the listing
        serve(mocks, pages(3), { page: 3, matched: 23, total: 23 });
        fixture.componentRef.setInput('page', '3');
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenCalledTimes(1);
        expect(mocks.listing.query).toHaveBeenLastCalledWith('pages', expect.objectContaining({ page: 3 }));
    });

    it('asks the server when the sort differs from what the resolver loaded', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('listing', listingPage(pages(3)));
        fixture.detectChanges();
        comp.sortBy('title');
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenCalledTimes(1);
        expect(mocks.listing.query).toHaveBeenLastCalledWith('pages', expect.objectContaining({ sort: 'title' }));
    });

    it('requests the page from the URL', () => {
        const mocks = createMocks();
        const { fixture } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('page', '3');
        serve(mocks, [{ _id: 'p1', title: 'A' }], { page: 3, matched: 41, total: 41 });
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenCalledTimes(1);
        expect(mocks.listing.query).toHaveBeenLastCalledWith('pages', expect.objectContaining({ page: 3 }));
    });

    it('treats a broken page parameter as the first page', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('page', 'abc');
        fixture.detectChanges();
        expect(comp.currentPage()).toBe(1);
    });

    it('waits for the post type before requesting posts, then sends its key', () => {
        const mocks = createMocks();
        const { fixture } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.detectChanges();
        expect(mocks.listing.query).not.toHaveBeenCalled();
        fixture.componentRef.setInput('model', makePostType({ type: 'articles' }));
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenLastCalledWith('posts', expect.objectContaining({ postType: 'articles' }));
    });

    it('uses the page size kept for the listing', () => {
        localStorage.setItem('listing.pageSize.posts.news', '50');
        const mocks = createMocks();
        const { fixture } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ id: 5, type: 'news' }));
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenLastCalledWith('posts', expect.objectContaining({ limit: 50 }));
    });

    it('setPageSize keeps the size, goes back to page 1 and requests again', () => {
        const mocks = createMocks();
        const { fixture, comp, router } = setup(mocks);
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('page', '4');
        fixture.detectChanges();
        comp.setPageSize(100);
        fixture.detectChanges();
        expect(localStorage.getItem('listing.pageSize.pages')).toBe('100');
        expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { page: null }, replaceUrl: true }));
        expect(mocks.listing.query).toHaveBeenLastCalledWith('pages', expect.objectContaining({ page: 1, limit: 100 }));
    });

    it('sortBy goes back to page 1 and requests with the new sort', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('page', '2');
        fixture.detectChanges();
        comp.sortBy('-title');
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenLastCalledWith('pages', expect.objectContaining({ page: 1, sort: '-title' }));
    });

    it('does not navigate when already on page 1', () => {
        const mocks = createMocks();
        const { fixture, comp, router } = setup(mocks);
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.sortBy('title');
        expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('searches on the server after a pause in typing', () => {
        vi.useFakeTimers();
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        mocks.listing.query.mockClear();
        comp.onSearch('ho');
        comp.onSearch('home ');
        fixture.detectChanges();
        expect(mocks.listing.query).not.toHaveBeenCalled();
        expect(comp.search()).toBe('home ');
        vi.advanceTimersByTime(300);
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenCalledTimes(1);
        expect(mocks.listing.query).toHaveBeenLastCalledWith('pages', expect.objectContaining({ q: 'home' }));
        vi.useRealTimers();
    });

    it('sends the active post filters and goes back to page 1 when they change', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ fields: [{ type: 'checkbox', id: 'done', title: 'Done' }] }));
        fixture.componentRef.setInput('page', '3');
        fixture.detectChanges();
        comp.filters()!.checkboxes!.fields[0].value = true;
        comp.onFilterChange();
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenLastCalledWith(
            'posts',
            expect.objectContaining({ page: 1, filters: { checkbox: { done: true } } }),
        );
    });

    it('builds the number filter from the ranges of the first page', () => {
        const mocks = createMocks();
        serve(mocks, [], { ranges: { price: [1, 9] } });
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ fields: [{ type: 'number', id: 'price', title: 'Price' }] }));
        fixture.detectChanges();
        expect(comp.filters()!.numbers!.fields[0].range).toEqual([1, 9]);
    });

    it('keeps the chosen filter values when the ranges arrive', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        const fields = [
            { type: 'select', id: 'color', title: 'Color', options: ['red'] },
            { type: 'number', id: 'price', title: 'Price' },
        ];
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ fields: fields as any }));
        fixture.detectChanges();
        comp.filters()!.selects!.fields[0].values = ['red'];
        // the next response is the first one with ranges for this post type
        (comp as any).rangesFor = undefined;
        (comp as any).showPage(listingPage([], { ranges: { price: [0, 5] } }));
        expect(comp.filters()!.selects!.fields[0].values).toEqual(['red']);
        expect(comp.filters()!.numbers!.fields[0].range).toEqual([0, 5]);
    });

    it('moves to the page the server served when the requested one is past the end', () => {
        const mocks = createMocks();
        serve(mocks, pages(1), { page: 2, matched: 21, total: 21 });
        const { fixture, comp, router } = setup(mocks);
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('page', '9');
        fixture.detectChanges();
        expect(comp.currentPage()).toBe(2);
        expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { page: 2 }, replaceUrl: true }));
    });

    it('runs a move to another page under the app loader, other changes only dim the list', () => {
        vi.useFakeTimers();
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('listing', listingPage(pages(20), { matched: 45, total: 45 }));
        fixture.detectChanges();

        serve(mocks, pages(20), { page: 2, matched: 45, total: 45 });
        fixture.componentRef.setInput('page', '2');
        fixture.detectChanges();
        expect(mocks.loader.track).toHaveBeenCalledTimes(1);

        serve(mocks, pages(20), { page: 1, matched: 45, total: 45 });
        comp.sortBy('title');
        fixture.detectChanges();
        comp.onSearch('abc');
        vi.advanceTimersByTime(300);
        fixture.detectChanges();
        comp.reload();
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenCalledTimes(4);
        expect(mocks.loader.track).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });

    it('keeps the search, filters and page when the file catalogues arrive late', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ type: 'news', fields: [{ type: 'catalogue', id: 'cat', title: 'Cat' }] }));
        fixture.componentRef.setInput('listing', listingPage(pages(3)));
        fixture.detectChanges();
        comp.search.set('abc');
        comp.filters()!.catalogues!.fields[0].values = ['x'];
        const filters = comp.filters();

        mocks.files.catalogues.set(['x', 'y']);
        fixture.detectChanges();
        expect(comp.search()).toBe('abc');
        expect(comp.filters()).toBe(filters);
        expect(mocks.listing.query).not.toHaveBeenCalled();
    });

    it('scrolls back to the top only after another page is rendered', async () => {
        const mocks = createMocks();
        serve(mocks, pages(20), { page: 1, matched: 45, total: 45 });
        const { fixture } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        await fixture.whenStable();
        expect(mocks.layout.scrollToTop).not.toHaveBeenCalled();

        serve(mocks, pages(20), { page: 2, matched: 45, total: 45 });
        fixture.componentRef.setInput('page', '2');
        fixture.detectChanges();
        await fixture.whenStable();
        expect(mocks.layout.scrollToTop).toHaveBeenCalledTimes(1);
    });

    it('does not scroll when the same page loads again', async () => {
        const mocks = createMocks();
        serve(mocks, pages(2));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        (comp as any).reload();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(mocks.listing.query).toHaveBeenCalledTimes(2);
        expect(mocks.layout.scrollToTop).not.toHaveBeenCalled();
    });

    it('alerts when the page cannot be loaded', () => {
        const mocks = createMocks();
        mocks.listing.query.mockReturnValue(throwError(() => ({ error: {} })));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        expect(mocks.tools.alert).toHaveBeenCalledWith('The list could not be loaded');
        expect(comp.loading()).toBe(false);
    });

    it('resets search, page size and filters when another post type opens', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ id: 1 }));
        fixture.detectChanges();
        comp.search.set('x');
        comp.pageSize.set(100);
        fixture.componentRef.setInput('model', makePostType({ id: 2 }));
        fixture.detectChanges();
        expect(comp.search()).toBe('');
        expect(comp.pageSize()).toBe(20);
    });
});

// ---------------------------------------------------------------------------
// editLink
// ---------------------------------------------------------------------------

describe('ListingComponent — editLink()', () => {
    it('returns the correct link for pages', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        const page = { _id: 'p1', id: 5, title: 'T', pageUrl: '/', rows: [] } as Page;
        expect(comp.editLink(page)).toEqual(['/pages', 'edit', 5]);
    });

    it('returns the correct link for posts', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ type: 'articles' }));
        fixture.detectChanges();
        const post = makePost({ id: 9, type: 'articles' });
        expect(comp.editLink(post)).toEqual(['/posts', 'articles', 'edit', 9]);
    });

    it('returns the correct link for postTypes', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        const pt = makePostType({ id: 3 });
        expect(comp.editLink(pt)).toEqual(['/post-types', 'edit', 3]);
    });

    it('returns the correct link for components', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'components');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        const c = { _id: 'c1', id: 8, title: 'Hero', type: 'hero', fields: [] };
        expect(comp.editLink(c)).toEqual(['/components', 'edit', 8]);
    });

    it('returns "/" as fallback for unknown family', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'unknown');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        const item = { _id: 'x1', id: 1, title: 'X' };
        expect(comp.editLink(item as any)).toEqual(['/']);
    });
});

// ---------------------------------------------------------------------------
// add()
// ---------------------------------------------------------------------------

describe('ListingComponent — add()', () => {
    it('navigates to /pages/add for pages family', () => {
        const { fixture, comp, router } = setup();
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.add();
        expect(navigateSpy).toHaveBeenCalledWith(['/pages/add']);
    });

    it('navigates to /posts/:type/add for posts family', () => {
        const { fixture, comp, router } = setup();
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ type: 'articles' }));
        fixture.detectChanges();
        comp.add();
        expect(navigateSpy).toHaveBeenCalledWith(['/posts', 'articles', 'add']);
    });

    it('navigates to /post-types/add for postTypes family', () => {
        const { fixture, comp, router } = setup();
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.add();
        expect(navigateSpy).toHaveBeenCalledWith(['/post-types/add']);
    });

    it('navigates to /components/add for components family', () => {
        const { fixture, comp, router } = setup();
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'components');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.add();
        expect(navigateSpy).toHaveBeenCalledWith(['/components/add']);
    });
});

// ---------------------------------------------------------------------------
// removeDialog()
// ---------------------------------------------------------------------------

describe('ListingComponent — removeDialog()', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('calls tools.confirm with a message containing the item title', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();

        comp.removeDialog(page);
        expect(mocks.tools.confirm).toHaveBeenCalledWith(expect.stringContaining('Home'));
    });

    it('calls pagesService.remove when user confirms', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();

        comp.removeDialog(page);
        expect(mocks.pages.remove).toHaveBeenCalledWith('p1');
    });

    it('does not call remove when user cancels', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(false));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();

        comp.removeDialog(page);
        expect(mocks.pages.remove).not.toHaveBeenCalled();
    });

    it('sets removeStatus with status 200 after successful remove', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();

        comp.removeDialog(page);
        expect(comp.removeStatus()?.status).toBe(200);
        expect(comp.lastRemoved()).toBe(page);
    });

    it('loads the page again after the undo timer expires', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        serve(mocks, [page]);
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();

        comp.removeDialog(page);
        expect(comp.items()).toHaveLength(1); // still shown (undo window)
        mocks.listing.query.mockClear();
        serve(mocks, []);
        vi.advanceTimersByTime(2000);
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenCalledTimes(1);
        expect(comp.items()).toHaveLength(0);
        expect(comp.removeStatus()).toBeUndefined();
        expect(comp.lastRemoved()).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// sortBy()
// ---------------------------------------------------------------------------

describe('ListingComponent — sortBy()', () => {
    afterEach(() => sessionStorage.clear());

    it('updates sortCurrent signal', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.sortBy('-created');
        expect(comp.sortCurrent()).toBe('-created');
    });

    it('persists the choice to sessionStorage', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.sortBy('title');
        expect(sessionStorage.getItem('sorting.pages')).toBe('title');
    });

    it('keeps the sort of posts under the post type key', () => {
        const { fixture, comp } = setup();
        // postType with no id — postTypeId() will be undefined
        const postTypeNoId = { _id: 'pt1', title: 'T', type: 'articles', pluralTitle: 'A', fields: [], posts: [] };
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', postTypeNoId);
        fixture.detectChanges();
        comp.sortBy('title');
        expect(sessionStorage.getItem('sorting.posts.articles')).toBe('title');
    });
});

// ---------------------------------------------------------------------------
// resetFilters()
// ---------------------------------------------------------------------------

describe('ListingComponent — resetFilters()', () => {
    it('resets text filter value', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.search.set('search');
        comp.resetFilters();
        expect(comp.search()).toBe('');
    });

    it('does not throw when filters is undefined', () => {
        const { fixture, comp } = setup();
        // family with no model → filters remain undefined
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ fields: [] }));
        fixture.detectChanges();
        expect(() => comp.resetFilters()).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// editPostType()
// ---------------------------------------------------------------------------

describe('ListingComponent — editPostType()', () => {
    it('navigates to /post-types/edit/:id', () => {
        const { fixture, comp, router } = setup();
        const navigateSpy = vi.spyOn(router, 'navigate');
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ id: 7 }));
        fixture.detectChanges();
        comp.editPostType();
        expect(navigateSpy).toHaveBeenCalledWith(['/post-types/edit', 7]);
    });
});

// ---------------------------------------------------------------------------
// export()
// ---------------------------------------------------------------------------

describe('ListingComponent — export()', () => {
    // jsdom logs "Not implemented: navigation" when the download link is clicked
    beforeEach(() => {
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });
    afterEach(() => vi.restoreAllMocks());

    it('opens the dialog with every row of the listing, in its sort', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.export();
        expect(mocks.listing.all).toHaveBeenCalledWith('pages', { postType: undefined, sort: comp.sortCurrent() });
        expect(mocks.dialog.open).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ data: { title: 'pages', items: EXPORT_ROWS } }),
        );
    });

    it('exports the whole collection when every item is chosen', () => {
        const mocks = createMocks();
        mocks.pages.exportData.mockReturnValue(of('/export/pages.json'));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.export();
        expect(mocks.pages.exportData).toHaveBeenCalledWith(undefined);
    });

    it('exports only the chosen items', () => {
        chosen.ids = ['a1', 'c3'];
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.export();
        expect(mocks.pages.exportData).toHaveBeenCalledWith(['a1', 'c3']);
    });

    it('exports nothing on Cancel', () => {
        chosen.ids = undefined;
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.export();
        expect(mocks.pages.exportData).not.toHaveBeenCalled();
        expect(comp.exportStatus()).toBe(false);
    });

    it('exports the chosen posts of the listing\'s post type', () => {
        chosen.ids = ['b2'];
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ type: 'articles' }));
        fixture.detectChanges();
        comp.export();
        expect(mocks.listing.all).toHaveBeenCalledWith('posts', expect.objectContaining({ postType: 'articles' }));
        expect(mocks.posts.exportData).toHaveBeenCalledWith('articles', ['b2']);
    });

    it('calls postTypesService.exportData() for postTypes family', () => {
        chosen.ids = ['a1'];
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.detectChanges();
        comp.export();
        expect(mocks.postTypes.exportData).toHaveBeenCalledWith(['a1']);
    });

    it('calls componentsService.exportData() for components family', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'components');
        fixture.detectChanges();
        comp.export();
        expect(mocks.components.exportData).toHaveBeenCalledWith(undefined);
    });

    it('sets exportStatus to false after success', () => {
        const mocks = createMocks();
        mocks.pages.exportData.mockReturnValue(of('/path'));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.export();
        expect(comp.exportStatus()).toBe(false);
    });

    it('shows alert and clears exportStatus on error', () => {
        const mocks = createMocks();
        mocks.pages.exportData.mockReturnValue(throwError(() => new Error('fail')));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.export();
        expect(mocks.tools.alert).toHaveBeenCalledWith('There was an error exporting');
        expect(comp.exportStatus()).toBe(false);
    });

    it('shows alert when the rows cannot be loaded, without opening the dialog', () => {
        const mocks = createMocks();
        mocks.listing.all.mockReturnValue(throwError(() => new Error('fail')));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        comp.export();
        expect(mocks.dialog.open).not.toHaveBeenCalled();
        expect(mocks.tools.alert).toHaveBeenCalled();
        expect(comp.exportStatus()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// removeDialog() — additional families
// ---------------------------------------------------------------------------

describe('ListingComponent — removeDialog() for multiple families', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('calls postsService.remove for posts family', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const { fixture, comp } = setup(mocks);
        const postType = makePostType({ posts: [makePost({ _id: 'post1' })] });
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', postType);
        fixture.detectChanges();
        comp.removeDialog(postType.posts![0]);
        expect(mocks.posts.remove).toHaveBeenCalledWith('post1');
    });

    it('calls postTypesService.remove and refreshMenu for postTypes family', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const { fixture, comp } = setup(mocks);
        const pt = makePostType({ _id: 'ptid' });
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.componentRef.setInput('model', [pt]);
        fixture.detectChanges();
        comp.removeDialog(pt);
        expect(mocks.postTypes.remove).toHaveBeenCalledWith('ptid');
        expect(mocks.postTypes.refreshMenu).toHaveBeenCalled();
    });

    it('calls componentsService.remove for components family', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const { fixture, comp } = setup(mocks);
        const c = { _id: 'cid', id: 1, title: 'Hero', type: 'hero', fields: [] };
        fixture.componentRef.setInput('family', 'components');
        fixture.componentRef.setInput('model', [c]);
        fixture.detectChanges();
        comp.removeDialog(c);
        expect(mocks.components.remove).toHaveBeenCalledWith('cid');
    });

    it('immediately removes previously-pending item when a second remove fires', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const { fixture, comp } = setup(mocks);
        const p1 = { _id: 'p1', id: 1, title: 'Page 1' };
        const p2 = { _id: 'p2', id: 2, title: 'Page 2' };
        serve(mocks, [p1, p2]);
        fixture.componentRef.setInput('family', 'pages');
        fixture.detectChanges();
        const [r1, r2] = comp.items();

        // Remove p1 — starts undo timer
        comp.removeDialog(r1);
        expect(comp.items()).toHaveLength(2); // p1 still in undo window

        // Remove p2 before undo timer fires — p1 should be flushed immediately
        comp.removeDialog(r2);
        expect(comp.items()).toHaveLength(1); // p1 removed, p2 in undo window
    });

    it('shows alert and clears removeStatus on remove error', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        mocks.pages.remove.mockReturnValue(throwError(() => ({ error: { error: 'DB error' } })));
        const { fixture, comp } = setup(mocks);
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();
        comp.removeDialog(page);
        expect(mocks.tools.alert).toHaveBeenCalledWith('DB error');
        expect(comp.removeStatus()).toBeUndefined();
    });

    it('shows error.error string when error.error.error is absent', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        mocks.pages.remove.mockReturnValue(throwError(() => ({ error: 'Simple error message' })));
        const { fixture, comp } = setup(mocks);
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();
        comp.removeDialog(page);
        expect(mocks.tools.alert).toHaveBeenCalledWith('Simple error message');
    });

    it('shows default "Error removing" when error has no message', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        mocks.pages.remove.mockReturnValue(throwError(() => ({})));
        const { fixture, comp } = setup(mocks);
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();
        comp.removeDialog(page);
        expect(mocks.tools.alert).toHaveBeenCalledWith('Error removing');
    });
});

// ---------------------------------------------------------------------------
// onImportFile()
// ---------------------------------------------------------------------------

describe('ListingComponent — onImportFile()', () => {
    it('does nothing when no file is selected', () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        const event = { target: { files: null } } as unknown as Event;
        comp.onImportFile(event);
        expect(mocks.pages.importData).not.toHaveBeenCalled();
    });

    it('shows alert when file content is not valid JSON', async () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();

        const blob = new Blob(['not json'], { type: 'application/json' });
        const file = new File([blob], 'import.json');
        const input = { files: [file], value: '' } as unknown as HTMLInputElement;
        const event = { target: input } as unknown as Event;

        comp.onImportFile(event);
        await new Promise((r) => setTimeout(r, 50));
        expect(mocks.tools.alert).toHaveBeenCalledWith('Wrong file format!');
    });

    it('shows alert when parsed JSON has no items', async () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();

        const blob = new Blob(['[]'], { type: 'application/json' });
        const file = new File([blob], 'import.json');
        const input = { files: [file], value: '' } as unknown as HTMLInputElement;
        const event = { target: input } as unknown as Event;

        comp.onImportFile(event);
        await new Promise((r) => setTimeout(r, 50));
        expect(mocks.tools.alert).toHaveBeenCalledWith('There is no correct posts to import');
    });

    it('calls importData when JSON has items', async () => {
        const mocks = createMocks();
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();

        const pages: Page[] = [{ _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] }];
        const blob = new Blob([JSON.stringify(pages)], { type: 'application/json' });
        const file = new File([blob], 'import.json');
        const input = { files: [file], value: '' } as unknown as HTMLInputElement;
        const event = { target: input } as unknown as Event;

        comp.onImportFile(event);
        await new Promise((r) => setTimeout(r, 50));
        expect(mocks.pages.importData).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// import() via apiImport() — per-family routing
// ---------------------------------------------------------------------------

describe('ListingComponent — import() per family', () => {
    it('calls postsService.importData for posts family', () => {
        const mocks = createMocks();
        mocks.posts.importData.mockReturnValue(of({ imported: 1 }));
        const { fixture, comp } = setup(mocks);
        const postType = makePostType({ type: 'articles', posts: [] });
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', postType);
        fixture.detectChanges();
        (comp as any).import([makePost()]);
        expect(mocks.posts.importData).toHaveBeenCalledWith(
            expect.objectContaining({ postType: 'articles' }),
        );
    });

    it('calls postTypesService.importData for postTypes family', () => {
        const mocks = createMocks();
        mocks.postTypes.importData.mockReturnValue(of({ imported: 0 }));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        (comp as any).import([makePostType()]);
        expect(mocks.postTypes.importData).toHaveBeenCalled();
    });

    it('calls componentsService.importData for components family', () => {
        const mocks = createMocks();
        mocks.components.importData.mockReturnValue(of({ imported: 0 }));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'components');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        (comp as any).import([{ _id: 'c1', id: 1, title: 'Hero', type: 'hero', fields: [] }]);
        expect(mocks.components.importData).toHaveBeenCalled();
    });

    it('shows alert and clears importStatus on import error', () => {
        const mocks = createMocks();
        mocks.pages.importData.mockReturnValue(throwError(() => ({ error: { error: 'Import failed' } })));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        (comp as any).import([{ _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] }]);
        expect(mocks.tools.alert).toHaveBeenCalledWith('Import failed');
        expect(comp.importStatus()).toBe(false);
    });

    it('shows default import error message when error has no nested error', () => {
        const mocks = createMocks();
        mocks.pages.importData.mockReturnValue(throwError(() => ({})));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        (comp as any).import([{ _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] }]);
        expect(mocks.tools.alert).toHaveBeenCalledWith('There was an error importing');
    });

    it('shows success alert and loads the page again after pages import', () => {
        const imported: Page[] = [
            { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] },
            { _id: 'p2', id: 2, title: 'About', pageUrl: '/about', rows: [] },
        ];
        const mocks = createMocks();
        mocks.pages.importData.mockReturnValue(of({ imported: 2 }));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        mocks.listing.query.mockClear();
        serve(mocks, imported);
        (comp as any).import(imported);
        fixture.detectChanges();
        expect(mocks.listing.query).toHaveBeenCalledTimes(1);
        expect(comp.items()).toHaveLength(2);
        expect(comp.count()).toBe(2);
        expect(mocks.tools.alert).toHaveBeenCalledWith(expect.stringContaining('2'));
    });
});
