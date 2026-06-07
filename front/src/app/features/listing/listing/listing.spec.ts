import { Component, Directive, NO_ERRORS_SCHEMA, input, output, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

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
        imports: [ListingComponent],
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
});
