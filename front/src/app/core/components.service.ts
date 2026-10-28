import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ComponentEntity } from '../models/models';

/** Port of components.service.js */
@Injectable({ providedIn: 'root' })
export class ComponentsService {
    private http = inject(HttpClient);

    private _list = signal<ComponentEntity[]>([]);
    private _loaded = signal(false);
    private loading = false;
    /** Components to choose in a "component" field: loaded by loadList() or componentsResolver. */
    readonly list = this._list.asReadonly();
    /** false until the list is loaded, and again after a component is added, changed or removed. */
    readonly loaded = this._loaded.asReadonly();

    /** Loads the list for "component" fields, unless it is loaded and nothing changed since. */
    loadList(): void {
        if (this._loaded() || this.loading) {
            return;
        }
        this.loading = true;
        this.getAll().subscribe({
            next: (components) => this.setList(components),
            // the next "component" field tries again
            error: () => (this.loading = false),
        });
    }

    setList(components: ComponentEntity[]): void {
        this._list.set(components ?? []);
        this._loaded.set(true);
        this.loading = false;
    }

    create(data: ComponentEntity): Observable<ComponentEntity> {
        return this.http.post<ComponentEntity>('/api/component', data).pipe(tap(this.listChanged));
    }

    edit(data: ComponentEntity): Observable<ComponentEntity> {
        return this.http.put<ComponentEntity>('/api/component/edit', data).pipe(tap(this.listChanged));
    }

    getAll(): Observable<ComponentEntity[]> {
        return this.http.get<ComponentEntity[]>('/api/component');
    }

    getById(id: string | number): Observable<ComponentEntity> {
        return this.http.get<ComponentEntity>(`/api/component/${id}`);
    }

    remove(id: string | number): Observable<string> {
        return this.http.delete('/api/component/' + id, { responseType: 'text' }).pipe(tap(this.listChanged));
    }

    exportData(): Observable<string> {
        return this.http.get('/api/exportComponents', { responseType: 'text' });
    }

    importData(data: { posts: ComponentEntity[] }): Observable<ComponentEntity[]> {
        return this.http.post<ComponentEntity[]>('/api/importComponents', data).pipe(tap(this.listChanged));
    }

    private readonly listChanged = (): void => this._loaded.set(false);
}
