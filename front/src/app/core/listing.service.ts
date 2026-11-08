import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActiveFilters } from '../features/listing/listing-filter';

export type ListingFamily = 'posts' | 'pages' | 'components' | 'postTypes';

/** A listing row: only what the list shows and links to (no rows, fields or post data). */
export interface ListingRow {
    _id: string;
    id?: number;
    title: string;
    type?: string;
    created?: number;
    /** pages only: hidden from the public site */
    draft?: boolean;
}

export interface ListingQuery {
    /** key of the post type, for the posts listing */
    postType?: string;
    page: number;
    limit: number;
    sort: string;
    q?: string;
    filters?: ActiveFilters | null;
}

export interface ListingPage {
    items: ListingRow[];
    /** the page served: the last one when the requested page is past it */
    page: number;
    limit: number;
    /** items matching the search and filters */
    matched: number;
    /** all items of the listing */
    total: number;
    /** posts only: `{ fieldId: [min, max] }` of number and date fields over the whole type */
    ranges?: Record<string, [number, number] | [string, string]>;
}

/** One page of a listing; search, filters and sort run on the server. */
@Injectable({ providedIn: 'root' })
export class ListingService {
    private http = inject(HttpClient);

    query(family: ListingFamily, query: ListingQuery): Observable<ListingPage> {
        let params = new HttpParams()
            .set('page', query.page)
            .set('limit', query.limit)
            .set('sort', query.sort);
        if (query.postType) {
            params = params.set('postType', query.postType);
        }
        if (query.q) {
            params = params.set('q', query.q);
        }
        if (query.filters && Object.keys(query.filters).length) {
            params = params.set('filters', JSON.stringify(query.filters));
        }
        return this.http.get<ListingPage>(`/api/listing/${family}`, { params });
    }
}
