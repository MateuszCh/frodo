import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ImportResult, Page } from '../models/models';

/** Port of pages.service.js */
@Injectable({ providedIn: 'root' })
export class PagesService {
    private http = inject(HttpClient);

    create(data: Page): Observable<Page> {
        return this.http.post<Page>('/api/page', data);
    }

    edit(data: Page): Observable<Page> {
        return this.http.put<Page>('/api/page/edit', data);
    }

    getById(id: string | number): Observable<Page> {
        return this.http.get<Page>(`/api/page/${id}`);
    }

    remove(id: string | number): Observable<string> {
        return this.http.delete('/api/page/' + id, { responseType: 'text' });
    }

    /** All pages, or only those with the given `_id`s. */
    exportData(ids?: string[]): Observable<string> {
        return this.http.post('/api/exportPages', ids ? { ids } : {}, { responseType: 'text' });
    }

    importData(data: { posts: Page[] }): Observable<ImportResult> {
        return this.http.post<ImportResult>('/api/importPages', data);
    }
}
