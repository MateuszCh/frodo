import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post, PostType } from '../models/models';

/** Port of posts.service.js */
@Injectable({ providedIn: 'root' })
export class PostsService {
    private http = inject(HttpClient);

    create(data: Post): Observable<Post> {
        return this.http.post<Post>('/api/post', data);
    }

    edit(data: Post): Observable<Post> {
        return this.http.put<Post>('/api/post/edit', data);
    }

    getById(id: string | number): Observable<Post> {
        return this.http.get<Post>(`/api/post/${id}`);
    }

    remove(id: string | number): Observable<string> {
        return this.http.delete('/api/post/' + id, { responseType: 'text' });
    }

    exportData(postType: string): Observable<string> {
        return this.http.get(`/api/exportPosts/${postType}`, { responseType: 'text' });
    }

    importData(data: { postType: string; posts: Post[] }): Observable<PostType> {
        return this.http.post<PostType>('/api/importPosts', data);
    }
}
