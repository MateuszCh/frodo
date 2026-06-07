import { Component, Directive, NO_ERRORS_SCHEMA, input, output, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { of, throwError } from 'rxjs';

import { ListingComponent } from './listing';
import { ListingFiltersComponent } from '../listing-filters/listing-filters';
import { InfiniteScrollDirective } from '../../../shared/infinite-scroll.directive';

import { LayoutService } from '../../../core/layout.service';
import { ToolsService } from '../../../core/tools.service';
import { PagesService } from '../../../core/pages.service';
import { PostsService } from '../../../core/posts.service';
import { PostTypesService } from '../../../core/post-types.service';
import { ComponentsService } from '../../../core/components.service';
import { FilesService } from '../../../core/files.service';
import { makePost, makePostType } from '../../../testing/test-helpers';
import type { Page, Post, PostType } from '../../../models/models';

import type { Filters } from '../listing-filter';

// ---------------------------------------------------------------------------
// Minimal stubs — inputs/outputs must match originals so template bindings resolve.
// ---------------------------------------------------------------------------

@Component({ selector: 'app-listing-filters', standalone: true, template: '' })
class StubListingFilters {
    readonly filters = input<Filters>();
    readonly type = input<string>('');
    readonly changed = output<void>();
}

@Directive({ selector: '[appInfiniteScroll]', standalone: true })
class StubInfiniteScroll {
    readonly reached = output<void>();
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function createMocks() {
    return {
        tools: { confirm: vi.fn().mockReturnValue(of(true)), alert: vi.fn() },
        layout: { size: signal<string>('size-x') },
        pages: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of([])) },
        posts: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of({ posts: [] })) },
        postTypes: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of([])), refreshMenu: vi.fn() },
        components: { remove: vi.fn().mockReturnValue(of('ok')), exportData: vi.fn().mockReturnValue(of('/path')), importData: vi.fn().mockReturnValue(of([])) },
        files: { catalogues: signal<string[]>([]) },
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
        ],
    }).overrideComponent(ListingComponent, {
        remove: { imports: [ListingFiltersComponent, InfiniteScrollDirective] },
        add: { imports: [StubListingFilters, StubInfiniteScroll] },
    });

    const fixture: ComponentFixture<ListingComponent> = TestBed.createComponent(ListingComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance as any;
    return { fixture, comp, mocks, router: TestBed.inject(Router) };
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

    it('title falls back to "" when pluralTitle is undefined (line 143 ?? branch)', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'posts');
        // makePostType without explicit pluralTitle leaves it as the default 'Test Types',
        // so override to undefined
        fixture.componentRef.setInput('model', makePostType({ pluralTitle: undefined as unknown as string }));
        fixture.detectChanges();
        expect(comp.title()).toBe('');
    });

    it('postType and postTypeId computeds return undefined for non-posts family (lines 91-94 false branches)', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        // Access private computeds directly to force the false branch evaluation
        expect((comp as any).postType()).toBeUndefined();
        expect((comp as any).postTypeId()).toBeUndefined();
    });

    it('posts ?? [] fallback when PostType.posts is null (line 118 ?? branch)', () => {
        const { fixture, comp } = setup();
        const postTypeNullPosts = makePostType({ posts: null as unknown as [] });
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', postTypeNullPosts);
        fixture.detectChanges();
        // baseModels falls back to [] when posts is null
        expect(comp.visible()).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// effect: baseModels and limit init
// ---------------------------------------------------------------------------

describe('ListingComponent — constructor effect', () => {
    it('sets baseModels from a pages array', () => {
        const { fixture, comp } = setup();
        const pages: Page[] = [
            { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] },
            { _id: 'p2', id: 2, title: 'About', pageUrl: '/about', rows: [] },
        ];
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', pages);
        fixture.detectChanges();
        expect(comp.baseModels()).toHaveLength(2);
    });

    it('sets baseModels from posts inside a PostType model', () => {
        const { fixture, comp } = setup();
        const postType = makePostType({ posts: [makePost(), makePost()] });
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', postType);
        fixture.detectChanges();
        expect(comp.baseModels()).toHaveLength(2);
    });

    it('resets limit to 20 when model changes', () => {
        const { fixture, comp } = setup();
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.limit.set(50);
        fixture.componentRef.setInput('model', [{ _id: 'p3', id: 3, title: 'New', pageUrl: '/new', rows: [] }]);
        fixture.detectChanges();
        expect(comp.limit()).toBe(20);
    });
});

// ---------------------------------------------------------------------------
// visible / matchCount / incrementLimit
// ---------------------------------------------------------------------------

describe('ListingComponent — visible / incrementLimit', () => {
    it('visible returns the first 20 items', () => {
        const { fixture, comp } = setup();
        const pages: Page[] = Array.from({ length: 25 }, (_, i) => ({
            _id: `p${i}`, id: i, title: `Page ${i}`, pageUrl: `/${i}`, rows: [],
        }));
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', pages);
        fixture.detectChanges();
        expect(comp.visible()).toHaveLength(20);
    });

    it('incrementLimit loads more items', () => {
        const { fixture, comp } = setup();
        const pages: Page[] = Array.from({ length: 25 }, (_, i) => ({
            _id: `p${i}`, id: i, title: `Page ${i}`, pageUrl: `/${i}`, rows: [],
        }));
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', pages);
        fixture.detectChanges();
        comp.incrementLimit();
        expect(comp.visible()).toHaveLength(25);
    });

    it('incrementLimit does nothing when all items already visible (line 189 false branch)', () => {
        const { fixture, comp } = setup();
        const pages: Page[] = [{ _id: 'p1', id: 1, title: 'A', pageUrl: '/a', rows: [] }];
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', pages);
        fixture.detectChanges();
        // limit is 20, only 1 item → baseModels.length <= limit → false branch
        comp.incrementLimit();
        expect(comp.visible()).toHaveLength(1);
    });

    it('matchCount equals total items when no filters are active', () => {
        const { fixture, comp } = setup();
        const pages: Page[] = [
            { _id: 'p1', id: 1, title: 'A', pageUrl: '/a', rows: [] },
            { _id: 'p2', id: 2, title: 'B', pageUrl: '/b', rows: [] },
        ];
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', pages);
        fixture.detectChanges();
        expect(comp.matchCount()).toBe(2);
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

    it('removes the item from baseModels after the undo timer expires', () => {
        const mocks = createMocks();
        mocks.tools.confirm.mockReturnValue(of(true));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        const page: Page = { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] };
        fixture.componentRef.setInput('model', [page]);
        fixture.detectChanges();

        comp.removeDialog(page);
        expect(comp.baseModels()).toHaveLength(1); // still present (undo window)
        vi.advanceTimersByTime(2000);
        expect(comp.baseModels()).toHaveLength(0);
        expect(comp.removeStatus()).toBeUndefined();
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

    it('falls back to family name when postTypeId is undefined (line 184 ?? branch)', () => {
        const { fixture, comp } = setup();
        // postType with no id — postTypeId() will be undefined
        const postTypeNoId = { _id: 'pt1', title: 'T', type: 'articles', pluralTitle: 'A', fields: [], posts: [] };
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', postTypeNoId);
        fixture.detectChanges();
        comp.sortBy('title');
        expect(sessionStorage.getItem('sorting.posts')).toBe('title');
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
        // Build a filters object with a text value and reset it
        const filters = comp.filters();
        if (filters) {
            filters.textFilter.value = 'search';
            comp.resetFilters();
            expect(comp.filters()!.textFilter.value).toBeUndefined();
        }
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
    it('calls pagesService.exportData() for pages family', () => {
        const mocks = createMocks();
        mocks.pages.exportData.mockReturnValue(of('/export/pages.json'));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.export();
        expect(mocks.pages.exportData).toHaveBeenCalled();
    });

    it('calls postsService.exportData() for posts family', () => {
        const mocks = createMocks();
        mocks.posts.exportData.mockReturnValue(of('/export/posts.json'));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', makePostType({ type: 'articles' }));
        fixture.detectChanges();
        comp.export();
        expect(mocks.posts.exportData).toHaveBeenCalledWith('articles');
    });

    it('calls postTypesService.exportData() for postTypes family', () => {
        const mocks = createMocks();
        mocks.postTypes.exportData.mockReturnValue(of('/export/post-types.json'));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.export();
        expect(mocks.postTypes.exportData).toHaveBeenCalled();
    });

    it('calls componentsService.exportData() for components family', () => {
        const mocks = createMocks();
        mocks.components.exportData.mockReturnValue(of('/export/components.json'));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'components');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.export();
        expect(mocks.components.exportData).toHaveBeenCalled();
    });

    it('sets exportStatus to false after success', () => {
        const mocks = createMocks();
        mocks.pages.exportData.mockReturnValue(of('/path'));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.export();
        expect(comp.exportStatus()).toBe(false);
    });

    it('shows alert and clears exportStatus on error', () => {
        const mocks = createMocks();
        mocks.pages.exportData.mockReturnValue(throwError(() => new Error('fail')));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        comp.export();
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
        const p1: Page = { _id: 'p1', id: 1, title: 'Page 1', pageUrl: '/1', rows: [] };
        const p2: Page = { _id: 'p2', id: 2, title: 'Page 2', pageUrl: '/2', rows: [] };
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', [p1, p2]);
        fixture.detectChanges();

        // Remove p1 — starts undo timer
        comp.removeDialog(p1);
        expect(comp.baseModels()).toHaveLength(2); // p1 still in undo window

        // Remove p2 before undo timer fires — p1 should be flushed immediately
        comp.removeDialog(p2);
        expect(comp.baseModels()).toHaveLength(1); // p1 removed, p2 in undo window
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

    it('shows error.error string when error.error.error is absent (line 254 middle branch)', () => {
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

    it('shows default "Error removing" when error has no message (line 254 last branch)', () => {
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
        mocks.posts.importData.mockReturnValue(of({ posts: [makePost()], fields: [] }));
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
        mocks.postTypes.importData.mockReturnValue(of([]));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'postTypes');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        (comp as any).import([makePostType()]);
        expect(mocks.postTypes.importData).toHaveBeenCalled();
    });

    it('calls componentsService.importData for components family', () => {
        const mocks = createMocks();
        mocks.components.importData.mockReturnValue(of([]));
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

    it('shows default import error message when error has no nested error (line 319 fallback)', () => {
        const mocks = createMocks();
        mocks.pages.importData.mockReturnValue(throwError(() => ({})));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        (comp as any).import([{ _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] }]);
        expect(mocks.tools.alert).toHaveBeenCalledWith('There was an error importing');
    });

    it('shows success alert and updates baseModels after pages import', () => {
        const imported: Page[] = [
            { _id: 'p1', id: 1, title: 'Home', pageUrl: '/', rows: [] },
            { _id: 'p2', id: 2, title: 'About', pageUrl: '/about', rows: [] },
        ];
        const mocks = createMocks();
        mocks.pages.importData.mockReturnValue(of(imported));
        const { fixture, comp } = setup(mocks);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        (comp as any).import(imported);
        expect(comp.baseModels()).toHaveLength(2);
        expect(comp.count()).toBe(2);
        expect(mocks.tools.alert).toHaveBeenCalledWith(expect.stringContaining('2'));
    });
});
