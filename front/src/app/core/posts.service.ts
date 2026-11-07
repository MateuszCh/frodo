import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ImportResult, Post, PostType } from '../models/models';
import { PostTypesService } from './post-types.service';

/** Port of posts.service.js */
@Injectable({ providedIn: 'root' })
export class PostsService {
    private http = inject(HttpClient);
    private readonly postTypes = inject(PostTypesService);
    /** "post" fields list the posts of a type: each write here drops that list. */
    private readonly postsChanged = this.postTypes.postsChanged;
    /** Adding or removing posts also changes the post counts in the menu. */
    private readonly postCountChanged = (): void => {
        this.postsChanged();
        this.postTypes.refreshMenu();
    };

    create(data: Post): Observable<Post> {
        return this.http.post<Post>('/api/post', data).pipe(tap(this.postCountChanged));
    }

    edit(data: Post): Observable<Post> {
        return this.http.put<Post>('/api/post/edit', data).pipe(tap(this.postsChanged));
    }

    getById(id: string | number): Observable<Post> {
        return this.http.get<Post>(`/api/post/${id}`);
    }

    remove(id: string | number): Observable<string> {
        return this.http.delete('/api/post/' + id, { responseType: 'text' }).pipe(tap(this.postCountChanged));
    }

    exportData(postType: string): Observable<string> {
        return this.http.get(`/api/exportPosts/${postType}`, { responseType: 'text' });
    }

    importData(data: { postType: string; posts: Post[] }): Observable<ImportResult> {
        return this.http.post<ImportResult>('/api/importPosts', data).pipe(tap(this.postCountChanged));
    }
}
