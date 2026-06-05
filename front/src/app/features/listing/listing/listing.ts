import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ComponentEntity, Page, Post, PostType } from '../../../models/models';
import { PagesService } from '../../../core/pages.service';
import { PostsService } from '../../../core/posts.service';
import { PostTypesService } from '../../../core/post-types.service';
import { ComponentsService } from '../../../core/components.service';
import { FilesService } from '../../../core/files.service';
import { LayoutService } from '../../../core/layout.service';
import { ToolsService } from '../../../core/tools.service';
import { InfiniteScrollDirective } from '../../../shared/infinite-scroll.directive';
import { ListingFiltersComponent } from '../listing-filters/listing-filters';
import {
    Filters,
    SortType,
    applyFilters,
    applySort,
    buildFilters,
    buildSort,
    persistSort,
    resetFilters,
} from '../listing-filter';

type ListingItem = Page | ComponentEntity | PostType | Post;
type ListingModel = ListingItem[] | PostType;

interface RemoveStatus {
    busy?: string;
    result?: string;
    status?: number;
}

@Component({
    selector: 'app-listing',
    imports: [
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatListModule,
        MatTooltipModule,
        InfiniteScrollDirective,
        ListingFiltersComponent,
        RouterLink,
    ],
    templateUrl: './listing.html',
    styleUrl: './listing.scss',
})
export class ListingComponent {
    // resolve + route data, bound via withComponentInputBinding()
    readonly model = input<ListingModel>();
    readonly family = input<string>('');

    private router = inject(Router);
    private tools = inject(ToolsService);
    private layout = inject(LayoutService);

    protected readonly isDesktop = computed(() =>
        ['size-l', 'size-x', 'size-xl'].includes(this.layout.size()),
    );
    private pagesService = inject(PagesService);
    private postsService = inject(PostsService);
    private postTypesService = inject(PostTypesService);
    private componentsService = inject(ComponentsService);
    private filesService = inject(FilesService);

    // mutable per-listing state
    protected readonly baseModels = signal<ListingItem[]>([]);
    protected readonly filters = signal<Filters | undefined>(undefined);
    protected readonly sortTypes = signal<SortType[]>([]);
    protected readonly sortCurrent = signal('created');
    protected readonly limit = signal(20);
    protected readonly count = signal(0);
    protected readonly filterTick = signal(0);

    protected readonly removeStatus = signal<RemoveStatus | undefined>(undefined);
    protected readonly lastRemoved = signal<ListingItem | undefined>(undefined);
    protected readonly importStatus = signal(false);
    protected readonly exportStatus = signal(false);
    protected readonly filtersOpen = signal(false);

    protected readonly isPosts = computed(() => this.family() === 'posts');
    protected readonly title = computed(() => this.computeTitle());
    private readonly postType = computed(() =>
        this.isPosts() ? (this.model() as PostType).type : undefined,
    );
    private readonly postTypeId = computed(() =>
        this.isPosts() ? (this.model() as PostType).id : undefined,
    );

    protected readonly filtered = computed(() => {
        this.filterTick();
        const list = applyFilters(
            this.baseModels() as unknown as Record<string, unknown>[],
            this.filters(),
            this.family(),
        );
        return applySort(list, this.sortCurrent()) as unknown as ListingItem[];
    });
    protected readonly matchCount = computed(() => this.filtered().length);
    protected readonly visible = computed(() => this.filtered().slice(0, this.limit()));

    constructor() {
        // (re)initialise whenever the resolved model / family changes
        effect(() => {
            const family = this.family();
            const model = this.model();
            if (!model) {
                return;
            }
            const isPosts = family === 'posts';
            const posts = isPosts ? ((model as PostType).posts ?? []) : (model as ListingItem[]);
            const fields = isPosts ? (model as PostType).fields : undefined;

            this.baseModels.set(posts);
            this.count.set(posts.length);
            this.limit.set(20);
            this.removeStatus.set(undefined);
            this.lastRemoved.set(undefined);
            this.filtersOpen.set(false);

            const id = isPosts ? ((model as PostType).id ?? family) : family;
            const sort = buildSort(id, family, fields);
            this.sortTypes.set(sort.types);
            this.sortCurrent.set(sort.current);
            this.filters.set(
                buildFilters(fields, posts as Post[], family, this.filesService.catalogues()),
            );
        });
    }

    // ---- presentation helpers -------------------------------------------------

    private computeTitle(): string {
        switch (this.family()) {
            case 'posts':
                return (this.model() as PostType)?.pluralTitle ?? '';
            case 'pages':
                return 'pages';
            case 'components':
                return 'components';
            case 'postTypes':
                return 'post types';
            default:
                return '';
        }
    }

    editLink(model: ListingItem): unknown[] {
        switch (this.family()) {
            case 'posts':
                return ['/posts', (model as Post).type, 'edit', model.id];
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

    onFilterChange(): void {
        this.filterTick.update((n) => n + 1);
    }

    resetFilters(): void {
        const f = this.filters();
        if (f) {
            resetFilters(f, this.family());
            this.onFilterChange();
        }
    }

    sortBy(varName: string): void {
        this.sortCurrent.set(varName);
        const id = this.isPosts() ? (this.postTypeId() ?? this.family()) : this.family();
        persistSort(id, varName);
    }

    incrementLimit(): void {
        if (this.baseModels().length > this.limit()) {
            this.limit.update((l) => l + 10);
        }
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

    removeDialog(model: ListingItem): void {
        this.tools.confirm(`Are you sure you want to delete ${model.title}?`).subscribe((ok) => {
            if (ok) {
                this.remove(model);
            }
        });
    }

    private removeTimer?: ReturnType<typeof setTimeout>;

    private remove(model: ListingItem): void {
        clearTimeout(this.removeTimer);
        const last = this.lastRemoved();
        if (last) {
            this.baseModels.update((list) => list.filter((m) => m !== last));
            this.lastRemoved.set(undefined);
        }
        this.removeStatus.set({ busy: model._id });

        this.apiRemove(model._id!).subscribe({
            next: (result) => {
                this.removeStatus.set({ busy: model._id, result, status: 200 });
                if (this.family() === 'postTypes') {
                    this.postTypesService.refreshMenu();
                }
                this.lastRemoved.set(model);
                this.count.update((c) => c - 1);
                this.removeTimer = setTimeout(() => {
                    this.baseModels.update((list) => list.filter((m) => m !== model));
                    this.lastRemoved.set(undefined);
                    this.removeStatus.set(undefined);
                }, 2000);
            },
            error: (error) => {
                this.removeStatus.set(undefined);
                this.tools.alert(error?.error?.error ?? error?.error ?? 'Error removing');
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
                this.tools.alert('Wrong file format!');
                return;
            }
            if (Array.isArray(posts) && posts.length) {
                this.import(posts);
            } else {
                this.tools.alert('There is no correct posts to import');
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
                const newPosts = (response as PostType).posts ?? (response as ListingItem[]);
                const currentLength = newPosts.length;
                const added = currentLength - this.count();
                this.baseModels.set(newPosts as ListingItem[]);
                this.count.set(currentLength);
                if (this.isPosts()) {
                    const pt = response as PostType;
                    const sort = buildSort(pt.id ?? this.family(), 'posts', pt.fields);
                    this.sortTypes.set(sort.types);
                    this.sortCurrent.set(sort.current);
                    this.filters.set(
                        buildFilters(
                            pt.fields,
                            newPosts as Post[],
                            'posts',
                            this.filesService.catalogues(),
                        ),
                    );
                }
                if (this.family() === 'postTypes') {
                    this.postTypesService.refreshMenu();
                }
                this.tools.alert(
                    `${added} ${this.title()} ${added > 1 ? 'were' : 'was'} successfully imported`,
                );
            },
            error: (error) => {
                this.importStatus.set(false);
                this.tools.alert(error?.error?.error ?? 'There was an error importing');
            },
        });
    }

    export(): void {
        this.exportStatus.set(true);
        this.apiExport().subscribe({
            next: (path) => {
                this.exportStatus.set(false);
                const a = document.createElement('a');
                a.setAttribute('href', path);
                a.setAttribute('download', '');
                a.click();
            },
            error: () => {
                this.exportStatus.set(false);
                this.tools.alert('There was an error exporting');
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

    private apiExport(): Observable<string> {
        switch (this.family()) {
            case 'pages':
                return this.pagesService.exportData();
            case 'posts':
                return this.postsService.exportData(this.postType()!);
            case 'postTypes':
                return this.postTypesService.exportData();
            default:
                return this.componentsService.exportData();
        }
    }

    private apiImport(posts: unknown[]): Observable<unknown> {
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
