import { Component, computed, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { PAGE_SIZES } from '../../features/listing/listing-filter';

/** A page number, or null for the gap ("…") between numbers. */
export type PageItem = number | null;

/** The first and the last page, the current one with its neighbours, gaps between. */
export function pageItems(page: number, last: number): PageItem[] {
    const pages = [...new Set([1, page - 1, page, page + 1, last])]
        .filter((p) => p >= 1 && p <= last)
        .sort((a, b) => a - b);

    const items: PageItem[] = [];
    pages.forEach((p, i) => {
        const gap = i > 0 ? p - pages[i - 1] : 1;
        // a gap of a single page shows that page: "…" would take as much room
        if (gap === 2) {
            items.push(p - 1);
        } else if (gap > 2) {
            items.push(null);
        }
        items.push(p);
    });
    return items;
}

/** Pager under a listing: page links (?page=N in the URL) and the page size. */
@Component({
    selector: 'app-pagination',
    imports: [RouterLink],
    templateUrl: './pagination.html',
})
export class PaginationComponent {
    protected readonly t = inject(I18nService).t;
    private readonly router = inject(Router);
    protected readonly sizes = PAGE_SIZES;

    readonly page = input(1);
    readonly pageSize = input(20);
    /** items matching the search and filters */
    readonly matched = input(0);
    readonly pageSizeChange = output<number>();

    protected readonly last = computed(() => Math.max(1, Math.ceil(this.matched() / this.pageSize())));
    protected readonly items = computed(() => pageItems(this.page(), this.last()));
    /** some pages have no link ("…"): they can be typed in */
    protected readonly hasGaps = computed(() => this.items().includes(null));
    protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
    protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.matched()));

    /** Page 1 has no parameter, so a listing's plain URL is its first page. */
    protected params(page: number): { page: number | null } {
        return { page: page === 1 ? null : page };
    }

    /** Goes to the typed page (kept within the pages there are) and clears the box. */
    protected jump(event: Event): void {
        event.preventDefault();
        const input = event.target as HTMLInputElement;
        const typed = Number.parseInt(input.value, 10);
        input.value = '';
        if (!Number.isFinite(typed)) {
            return;
        }
        const page = Math.min(Math.max(typed, 1), this.last());
        if (page !== this.page()) {
            this.router.navigate([], { queryParams: this.params(page), queryParamsHandling: 'merge' });
        }
    }

    protected onSize(event: Event): void {
        this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
    }
}
