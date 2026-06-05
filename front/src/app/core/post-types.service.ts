import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { PostType } from '../models/models';

/** Port of postTypes.service.js */
@Injectable({ providedIn: 'root' })
export class PostTypesService {
    private http = inject(HttpClient);

    // Cached list driving the sidenav menu (legacy "postTypesUpdated" event).
    private _menu = signal<PostType[]>([]);
    readonly menu = this._menu.asReadonly();

    /** Reload the cached menu list; call after create/edit/delete of a post type. */
    refreshMenu(): void {
        this.getAll().subscribe((list) => this._menu.set(list ?? []));
    }

    create(data: PostType): Observable<PostType> {
        return this.http.post<PostType>('/api/postType', data);
    }

    edit(data: PostType): Observable<PostType> {
        return this.http.put<PostType>('/api/postType/edit', data);
    }

    getAll(): Observable<PostType[]> {
        return this.http
            .get<PostType[]>('/api/postType')
            .pipe(tap((list) => this._menu.set(list ?? [])));
    }

    getById(id: string | number): Observable<PostType> {
        return this.http.get<PostType>(`/api/postType/${id}`);
    }

    getByIdWithPosts(id: string | number): Observable<PostType> {
        return this.http.get<PostType>(`/api/postTypePosts/${id}`);
    }

    getByType(type: string): Observable<PostType> {
        return this.http.get<PostType>(`/api/postTypeByType/${type}`);
    }

    getByTypeWithPosts(type: string): Observable<PostType> {
        return this.http.get<PostType>(`/api/postTypeByTypePosts/${type}`);
    }

    remove(id: string | number): Observable<string> {
        return this.http.delete('/api/postType/' + id, { responseType: 'text' });
    }

    exportData(): Observable<string> {
        return this.http.get('/api/exportPostTypes', { responseType: 'text' });
    }

    importData(data: { posts: PostType[] }): Observable<PostType[]> {
        return this.http.post<PostType[]>('/api/importPostTypes', data);
    }
}
