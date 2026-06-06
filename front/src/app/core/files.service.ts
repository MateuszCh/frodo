import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { FileItem } from '../models/models';

export interface FileMeta {
    title?: string;
    description?: string;
    author?: string;
    place?: string;
    catalogues?: string[];
    position?: number;
}

/** Port of files.service.js — caches catalogues (preloaded at app init). */
@Injectable({ providedIn: 'root' })
export class FilesService {
    private http = inject(HttpClient);

    private _catalogues = signal<string[]>([]);
    readonly catalogues = this._catalogues.asReadonly();

    getAllFiles(): Observable<FileItem[]> {
        return this.http.get<FileItem[]>('/api/file');
    }

    loadCatalogues(): Observable<string[]> {
        return this.http
            .get<string[]>('/api/file/catalogues')
            .pipe(tap((catalogues) => this._catalogues.set(catalogues ?? [])));
    }

    setCatalogues(catalogues: string[]): void {
        this._catalogues.set(catalogues ?? []);
    }

    getByCatalogue(catalogue: string): Observable<FileItem[]> {
        return this.http.get<FileItem[]>(`/api/file/${catalogue}`);
    }

    edit(data: FileItem): Observable<FileItem> {
        return this.http.put<FileItem>('/api/file', data);
    }

    remove(id: string | number): Observable<string> {
        return this.http.delete('/api/file/' + id, { responseType: 'text' });
    }

    exportData(): Observable<string> {
        return this.http.get('/api/exportFiles', { responseType: 'text' });
    }

    importData(data: { files: FileItem[] }): Observable<FileItem[]> {
        return this.http.post<FileItem[]>('/api/importFiles', data);
    }

    /**
     * Multipart upload replacing ng-file-upload. Each file is appended under the
     * `files` field; per-file metadata is sent as `filesData[<filename>][<prop>]`
     * (bracket notation that the existing multer/express backend parses).
     * `reportProgress` lets callers track upload progress events.
     */
    upload(
        files: File[],
        filesData: Record<string, FileMeta> = {},
    ): Observable<HttpEvent<FileItem[]>> {
        const form = new FormData();
        files.forEach((file) => form.append('files', file, file.name));

        Object.entries(filesData).forEach(([filename, meta]) => {
            Object.entries(meta).forEach(([prop, value]) => {
                if (value === undefined || value === null) {
                    return;
                }
                if (Array.isArray(value)) {
                    value.forEach((item, i) =>
                        form.append(`filesData[${filename}][${prop}][${i}]`, String(item)),
                    );
                } else {
                    form.append(`filesData[${filename}][${prop}]`, String(value));
                }
            });
        });

        const req = new HttpRequest<FormData>('POST', '/api/file', form, {
            reportProgress: true,
            withCredentials: true,
        });
        return this.http.request<FileItem[]>(req);
    }
}
