import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, tap, throwError } from 'rxjs';
import { PostType } from '../models/models';

/** Port of postTypes.service.js */
@Injectable({ providedIn: 'root' })
export class PostTypesService {
    private http = inject(HttpClient);

    // Cached list driving the sidenav menu (legacy "postTypesUpdated" event).
    private _menu = signal<PostType[]>([]);
    readonly menu = this._menu.asReadonly();
    private _menuLoaded = signal(false);
    /** false until the menu list has loaded once: an empty menu may just not be there yet. */
    readonly menuLoaded = this._menuLoaded.asReadonly();

    /** Post types with the titles of their posts, for "post" fields: one request per type. */
    private postTitlesCache = new Map<string, Observable<PostType>>();

    /** Reload the cached menu list; call after create/edit/delete of a post type. */
    refreshMenu(): void {
        this.getAll().subscribe((list) => this._menu.set(list ?? []));
    }

    create(data: PostType): Observable<PostType> {
        return this.http.post<PostType>('/api/postType', data).pipe(tap(this.postsChanged));
    }

    edit(data: PostType): Observable<PostType> {
        return this.http.put<PostType>('/api/postType/edit', data).pipe(tap(this.postsChanged));
    }

    getAll(): Observable<PostType[]> {
        return this.http.get<PostType[]>('/api/postType').pipe(
            tap((list) => {
                this._menu.set(list ?? []);
                this._menuLoaded.set(true);
            }),
        );
    }

    /**
     * The post type `type` with the id, title and type of each of its posts, for "post" fields.
     * Every field of the type shares one request until a post or a post type changes; a failed
     * request is not kept.
     */
    getPostTitles(type: string): Observable<PostType> {
        let request = this.postTitlesCache.get(type);
        if (!request) {
            request = this.http.get<PostType>(`/api/postTypeByTypePostTitles/${type}`).pipe(
                catchError((error) => {
                    this.postTitlesCache.delete(type);
                    return throwError(() => error);
                }),
                shareReplay(1),
            );
            this.postTitlesCache.set(type, request);
        }
        return request;
    }

    /** Drops the post titles of "post" fields; posts or post types were added, changed or removed. */
    readonly postsChanged = (): void => this.postTitlesCache.clear();

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
        return this.http.delete('/api/postType/' + id, { responseType: 'text' }).pipe(tap(this.postsChanged));
    }

    exportData(): Observable<string> {
        return this.http.get('/api/exportPostTypes', { responseType: 'text' });
    }

    importData(data: { posts: PostType[] }): Observable<PostType[]> {
        return this.http.post<PostType[]>('/api/importPostTypes', data).pipe(tap(this.postsChanged));
    }
}
