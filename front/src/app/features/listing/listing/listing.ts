import {
    Component,
    DestroyRef,
    Injector,
    afterNextRender,
    computed,
    effect,
    inject,
    input,
    linkedSignal,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, catchError, finalize, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';

import { ComponentEntity, ImportResult, Page, Post, PostType } from '../../../models/models';
import { PagesService } from '../../../core/pages.service';
import { PostsService } from '../../../core/posts.service';
import { PostTypesService } from '../../../core/post-types.service';
import { ComponentsService } from '../../../core/components.service';
import { FilesService } from '../../../core/files.service';
import { LayoutService } from '../../../core/layout.service';
import { LoadingService } from '../../../core/loading.service';
import { ToolsService } from '../../../core/tools.service';
import { parsePage } from '../../../core/resolvers';
import {
    ListingFamily,
    ListingPage,
    ListingQuery,
    ListingRow,
    ListingService,
} from '../../../core/listing.service';
import { PaginationComponent } from '../../../shared/pagination/pagination';
import { ListingFiltersComponent } from '../listing-filters/listing-filters';
import { ExportDialogComponent, ExportDialogData } from '../export-dialog/export-dialog';
import {
    FilterRanges,
    Filters,
    PAGE_SIZES,
    SortType,
    buildFilters,
    buildSort,
    listingKey,
    persistPageSize,
    persistSort,
    readPageSize,
    resetFilters,
    serializeFilters,
} from '../listing-filter';
import { I18nService } from '../../../core/i18n/i18n.service';

/** How long the search waits for the next key before it asks the server. */
export const SEARCH_DEBOUNCE_MS = 300;

interface RemoveStatus {
    busy?: string;
    result?: string;
    status?: number;
}

interface ListingRequest extends ListingQuery {
    family: ListingFamily;
    /** bumped to load the same page again (after a removal or an import) */
    reload: number;
}

/** What a request asks for (not how often): equal keys get the same page. */
function requestKey(r: Omit<ListingRequest, 'reload'>): string {
    return JSON.stringify([r.family, r.postType ?? null, r.page, r.limit, r.sort, r.q || null, r.filters ?? null]);
}

/** Only the page number differs: a move to another page of the same list. */
function isPageTurn(before: Omit<ListingRequest, 'reload'> | undefined, after: ListingRequest): boolean {
    return !!before && before.page !== after.page && requestKey(before) === requestKey({ ...after, page: before.page });
}

@Component({
    selector: 'app-listing',
    imports: [MatButtonModule, MatMenuModule, ListingFiltersComponent, PaginationComponent, RouterLink],
    templateUrl: './listing.html',
})
export class ListingComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    protected readonly server = this.i18n.server;
    protected readonly newOfType = this.i18n.newOfType;

    // route data, query param and (posts) the resolved post type, bound via withComponentInputBinding()
    readonly model = input<PostType>();
    readonly family = input<string>('');
    readonly page = input<string | number>();
    /** the page in the URL, loaded by the route resolver with the kept page size and sort */
    readonly listing = input<ListingPage>();

    private router = inject(Router);
    private tools = inject(ToolsService);
    private layout = inject(LayoutService);
    private destroyRef = inject(DestroyRef);
    private injector = inject(Injector);
    private loader = inject(LoadingService);
    private dialog = inject(MatDialog);

    protected readonly isDesktop = computed(() =>
        ['size-l', 'size-x', 'size-xl'].includes(this.layout.size()),
    );
    private pagesService = inject(PagesService);
    private postsService = inject(PostsService);
    private postTypesService = inject(PostTypesService);
    private componentsService = inject(ComponentsService);
    private filesService = inject(FilesService);
    private listingService = inject(ListingService);

    // the page shown: follows the URL, and goes back to 1 at once when the search, a filter,
    // the sort or the page size changes (the URL follows), so only that page is requested
    protected readonly currentPage = linkedSignal(() => parsePage(this.page()));

    // mutable per-listing state
    protected readonly items = signal<ListingRow[]>([]);
    protected readonly matchCount = signal(0);
    protected readonly count = signal(0);
    protected readonly loaded = signal(false);
    protected readonly loading = signal(false);
    protected readonly filters = signal<Filters | undefined>(undefined);
    protected readonly sortTypes = signal<SortType[]>([]);
    protected readonly sortCurrent = signal('created');
    protected readonly pageSize = signal(20);
    protected readonly filterTick = signal(0);
    /** what the search box shows; `query` takes it after a pause in typing */
    protected readonly search = signal('');
    private readonly query = signal('');
    private readonly reloadTick = signal(0);
    /** the post type whose ranges the filters were built with */
    private rangesFor: unknown;
    /** the page number on screen, to tell a move to another page from a reload */
    private shownPage = 0;
    /** what the route resolver loaded, so the same request is not sent again */
    private resolvedRequest?: string;
    /** the last request sent or resolved, to tell a move to another page from other changes */
    private lastRequest?: Omit<ListingRequest, 'reload'>;

    protected readonly removeStatus = signal<RemoveStatus | undefined>(undefined);
    protected readonly lastRemoved = signal<ListingRow | undefined>(undefined);
    protected readonly importStatus = signal(false);
    protected readonly exportStatus = signal(false);
    protected readonly filtersOpen = signal(false);

    /** up to this many items in the listing the pager is left out */
    protected readonly minPageSize = PAGE_SIZES[0];
    protected readonly isPosts = computed(() => this.family() === 'posts');
    /** Family part of the message keys (listing.new.pages, listing.empty.posts…). */
    protected readonly familyKey = computed(() => this.family() as ListingFamily);
    protected readonly title = computed(() => this.computeTitle());
    private readonly postType = computed(() => (this.isPosts() ? this.model()?.type : undefined));
    private readonly postTypeId = computed(() => (this.isPosts() ? this.model()?.id : undefined));
    /** key of the sort and page size kept per listing: the family, or the post type id */
    private readonly listingId = computed(() => listingKey(this.family(), this.postType()));

    private readonly activeFilters = computed(() => {
        this.filterTick();
        return this.isPosts() ? serializeFilters(this.filters()) : null;
    });

    private readonly request = computed<ListingRequest | null>(() => {
        const family = this.family() as ListingFamily;
        if (!family || (family === 'posts' && !this.model())) {
            return null;
        }
        return {
            family,
            postType: this.postType(),
            page: this.currentPage(),
            limit: this.pageSize(),
            sort: this.sortCurrent(),
            q: this.query() || undefined,
            filters: this.activeFilters(),
            reload: this.reloadTick(),
        };
    });

    private searchTimer?: ReturnType<typeof setTimeout>;

    constructor() {
        // (re)initialise whenever the listing changes (another family or post type)
        effect(() => {
            const family = this.family();
            const model = this.model();
            const isPosts = family === 'posts';
            if (!family || (isPosts && !model)) {
                return;
            }
            const fields = isPosts ? model!.fields : undefined;
            const id = listingKey(family, model?.type);

            this.items.set([]);
            this.matchCount.set(0);
            this.count.set(0);
            this.loaded.set(false);
            this.shownPage = 0;
            this.removeStatus.set(undefined);
            this.lastRemoved.set(undefined);
            this.filtersOpen.set(false);
            clearTimeout(this.searchTimer);
            this.search.set('');
            this.query.set('');
            this.pageSize.set(readPageSize(id));

            const sort = buildSort(id, family, fields);
            this.sortTypes.set(sort.types);
            this.sortCurrent.set(sort.current);
            // number and date filters need the ranges: rebuilt with the first page
            this.rangesFor = undefined;
            // catalogues arrive in the background: read untracked, so they never reset the listing
            const catalogues = untracked(this.filesService.catalogues);
            this.filters.set(buildFilters(fields, {}, family, catalogues));

            // the route resolved the page in the URL: show it now, without asking again
            const resolved = this.listing();
            this.lastRequest = undefined;
            if (resolved) {
                this.lastRequest = {
                    family: family as ListingFamily,
                    postType: model?.type,
                    page: resolved.page,
                    limit: resolved.limit,
                    sort: sort.current,
                    filters: null,
                };
                this.resolvedRequest = requestKey(this.lastRequest);
                untracked(() => this.showPage(resolved));
            }
        });

        // one request per change; a newer one cancels the one still running
        toObservable(this.request)
            .pipe(
                switchMap((request) => {
                    if (!request) {
                        return EMPTY;
                    }
                    const resolved = this.resolvedRequest === requestKey(request);
                    this.resolvedRequest = undefined;
                    if (resolved) {
                        return EMPTY;
                    }
                    this.loading.set(true);
                    const turn = isPageTurn(this.lastRequest, request);
                    const { family, reload: _reload, ...query } = request;
                    this.lastRequest = { family, ...query };
                    // another page: the app's loader (veil + spinner) covers the view until it is
                    // shown; a search, a filter, the sort or a reload only dim the list
                    const page$ = this.listingService.query(family, query);
                    return (turn ? this.loader.track(page$) : page$).pipe(
                        catchError((error) => {
                            this.tools.alert(this.server(error?.error?.error) || this.t('common.errorLoading'));
                            return EMPTY;
                        }),
                        finalize(() => this.loading.set(false)),
                    );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((page) => this.showPage(page));
    }

    private showPage(page: ListingPage): void {
        // another page than the one on screen: back to the top once it is rendered
        const moved = this.shownPage > 0 && page.page !== this.shownPage;
        this.shownPage = page.page;
        this.loading.set(false);
        this.items.set(page.items);
        this.matchCount.set(page.matched);
        this.count.set(page.total);
        this.loaded.set(true);
        this.lastRemoved.set(undefined);
        this.removeStatus.set(undefined);
        clearTimeout(this.removeTimer);

        if (this.isPosts() && page.ranges && this.rangesFor !== this.model()) {
            this.rangesFor = this.model();
            this.rebuildFilters(page.ranges);
        }
        // past the last page (an old link, the last item removed): show the page served
        if (page.page !== this.currentPage()) {
            this.goToPage(page.page, true);
        }
        if (moved) {
            afterNextRender(() => this.layout.scrollToTop(), { injector: this.injector });
        }
    }

    /** New ranges keep the search and the chosen values of the other filters. */
    private rebuildFilters(ranges: FilterRanges): void {
        const before = this.filters();
        const after = buildFilters(this.model()?.fields, ranges, 'posts', this.filesService.catalogues());
        if (before && after) {
            after.textFilter.value = before.textFilter.value;
            (['checkboxes', 'selects', 'multiselects', 'catalogues'] as const).forEach((group) => {
                after[group]?.fields.forEach((field) => {
                    const old = before[group]?.fields.find((f) => f.id === field.id);
                    if (old) {
                        field.value = old.value;
                        field.values = old.values;
                    }
                });
            });
        }
        this.filters.set(after);
    }

    private goToPage(page: number, replaceUrl = false): void {
        this.currentPage.set(page);
        this.router.navigate([], {
            queryParams: { page: page === 1 ? null : page },
            queryParamsHandling: 'merge',
            replaceUrl,
        });
    }

    /** The search, a filter, the sort or the page size changed: back to the first page. */
    private toFirstPage(): void {
        if (this.currentPage() !== 1 || parsePage(this.page()) !== 1) {
            this.goToPage(1, true);
        }
    }

    private reload(): void {
        this.reloadTick.update((n) => n + 1);
    }

    // ---- presentation helpers -------------------------------------------------

    private computeTitle(): string {
        switch (this.family()) {
            case 'posts':
                return (this.model() as PostType)?.pluralTitle ?? '';
            case 'pages':
                return this.t('listing.title.pages');
            case 'components':
                return this.t('listing.title.components');
            case 'postTypes':
                return this.t('listing.title.postTypes');
            default:
                return '';
        }
    }

    /** The three fixed sorts are translated; field sorts show the field title. */
    protected sortName(sort: SortType): string {
        switch (sort.varName) {
            case '-created':
                return this.t('listing.sort.newest');
            case 'created':
                return this.t('listing.sort.oldest');
            case 'title':
                return this.t('listing.sort.title');
            default:
                return sort.name;
        }
    }

    editLink(model: ListingRow): unknown[] {
        switch (this.family()) {
            case 'posts':
                return ['/posts', model.type, 'edit', model.id];
            case 'pages':
                return ['/pages', 'edit', model.id];
            case 'postTypes':
                return ['/post-types', 'edit', model.id];
            case 'components':
                return ['/components', 'edit', model.id];
            default:
                return ['/'];
        }
    }

    onSearch(text: string): void {
        this.search.set(text);
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            if (this.query() !== text.trim()) {
                this.toFirstPage();
                this.query.set(text.trim());
            }
        }, SEARCH_DEBOUNCE_MS);
    }

    /** The clear button: the search goes at once, without waiting for a pause. */
    clearSearch(): void {
        clearTimeout(this.searchTimer);
        this.search.set('');
        if (this.query()) {
            this.toFirstPage();
            this.query.set('');
        }
    }

    onFilterChange(): void {
        this.toFirstPage();
        this.filterTick.update((n) => n + 1);
    }

    resetFilters(): void {
        const f = this.filters();
        if (f) {
            resetFilters(f, this.family());
        }
        clearTimeout(this.searchTimer);
        this.search.set('');
        this.query.set('');
        this.onFilterChange();
    }

    sortBy(varName: string): void {
        this.toFirstPage();
        this.sortCurrent.set(varName);
        persistSort(this.listingId(), varName);
    }

    setPageSize(size: number): void {
        this.toFirstPage();
        this.pageSize.set(size);
        persistPageSize(this.listingId(), size);
    }

    // ---- navigation -----------------------------------------------------------

    add(): void {
        switch (this.family()) {
            case 'posts':
                this.router.navigate(['/posts', this.postType(), 'add']);
                break;
            case 'pages':
                this.router.navigate(['/pages/add']);
                break;
            case 'postTypes':
                this.router.navigate(['/post-types/add']);
                break;
            case 'components':
                this.router.navigate(['/components/add']);
                break;
        }
    }

    editPostType(): void {
        this.router.navigate(['/post-types/edit', this.postTypeId()]);
    }

    // ---- remove with undo (port of factory.remove/removeDialog) ---------------

    removeDialog(model: ListingRow): void {
        this.tools.confirm(this.t('common.confirmDelete', { name: model.title })).subscribe((ok) => {
            if (ok) {
                this.remove(model);
            }
        });
    }

    private removeTimer?: ReturnType<typeof setTimeout>;

    private remove(model: ListingRow): void {
        clearTimeout(this.removeTimer);
        const last = this.lastRemoved();
        if (last) {
            this.items.update((list) => list.filter((m) => m !== last));
            this.lastRemoved.set(undefined);
        }
        this.removeStatus.set({ busy: model._id });

        this.apiRemove(model._id).subscribe({
            next: (result) => {
                this.removeStatus.set({ busy: model._id, result, status: 200 });
                if (this.family() === 'postTypes') {
                    this.postTypesService.refreshMenu();
                }
                this.lastRemoved.set(model);
                // after the undo window the page is loaded again: the next item fills the gap
                this.removeTimer = setTimeout(() => this.reload(), 2000);
            },
            error: (error) => {
                this.removeStatus.set(undefined);
                this.tools.alert(error?.error?.error ?? error?.error ?? this.t('common.errorRemoving'));
            },
        });
    }

    // ---- import / export ------------------------------------------------------

    onImportFile(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            let posts: unknown;
            try {
                posts = JSON.parse(reader.result as string);
            } catch {
                this.tools.alert(this.t('common.wrongFileFormat'));
                return;
            }
            if (Array.isArray(posts) && posts.length) {
                this.import(posts);
            } else {
                this.tools.alert(this.t('listing.noPostsToImport'));
            }
        };
        reader.readAsText(file);
        input.value = '';
    }

    private import(posts: unknown[]): void {
        this.importStatus.set(true);
        this.apiImport(posts).subscribe({
            next: (response) => {
                this.importStatus.set(false);
                const added = response.imported;
                // new number and date values may widen the filter ranges
                this.rangesFor = undefined;
                this.reload();
                if (this.family() === 'postTypes') {
                    this.postTypesService.refreshMenu();
                }
                this.tools.alert(this.t('listing.imported', { count: added, title: this.title() }));
            },
            error: (error) => {
                this.importStatus.set(false);
                this.tools.alert(error?.error?.error ?? this.t('common.errorImporting'));
            },
        });
    }

    /**
     * Opens the export dialog with every item of the listing, in its sort, all of them checked,
     * and exports the ones chosen. All of them chosen: the whole collection, as before.
     */
    export(): void {
        this.exportStatus.set(true);
        this.listingService
            .all(this.family() as ListingFamily, { postType: this.postType(), sort: this.sortCurrent() })
            .subscribe({
                next: (items) => {
                    this.exportStatus.set(false);
                    this.dialog
                        .open<ExportDialogComponent, ExportDialogData, string[]>(ExportDialogComponent, {
                            data: { title: this.title(), items },
                            width: '560px',
                            maxWidth: '95vw',
                        })
                        .afterClosed()
                        .subscribe((ids) => {
                            if (ids?.length) {
                                this.runExport(ids.length === items.length ? undefined : ids);
                            }
                        });
                },
                error: (error) => {
                    this.exportStatus.set(false);
                    this.tools.alert(this.server(error?.error?.error) || this.t('common.errorLoading'));
                },
            });
    }

    private runExport(ids?: string[]): void {
        this.exportStatus.set(true);
        this.apiExport(ids).subscribe({
            next: (path) => {
                this.exportStatus.set(false);
                const a = document.createElement('a');
                a.setAttribute('href', path);
                a.setAttribute('download', '');
                a.click();
            },
            error: () => {
                this.exportStatus.set(false);
                this.tools.alert(this.t('common.errorExporting'));
            },
        });
    }

    // ---- per-family API plumbing ---------------------------------------------

    private apiRemove(id: string): Observable<string> {
        switch (this.family()) {
            case 'pages':
                return this.pagesService.remove(id);
            case 'posts':
                return this.postsService.remove(id);
            case 'postTypes':
                return this.postTypesService.remove(id);
            default:
                return this.componentsService.remove(id);
        }
    }

    private apiExport(ids?: string[]): Observable<string> {
        switch (this.family()) {
            case 'pages':
                return this.pagesService.exportData(ids);
            case 'posts':
                return this.postsService.exportData(this.postType()!, ids);
            case 'postTypes':
                return this.postTypesService.exportData(ids);
            default:
                return this.componentsService.exportData(ids);
        }
    }

    private apiImport(posts: unknown[]): Observable<ImportResult> {
        switch (this.family()) {
            case 'pages':
                return this.pagesService.importData({ posts: posts as Page[] });
            case 'posts':
                return this.postsService.importData({
                    postType: this.postType()!,
                    posts: posts as Post[],
                });
            case 'postTypes':
                return this.postTypesService.importData({ posts: posts as PostType[] });
            default:
                return this.componentsService.importData({ posts: posts as ComponentEntity[] });
        }
    }
}
