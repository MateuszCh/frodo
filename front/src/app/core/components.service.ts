import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComponentEntity } from '../models/models';

/** Port of components.service.js */
@Injectable({ providedIn: 'root' })
export class ComponentsService {
    private http = inject(HttpClient);

    create(data: ComponentEntity): Observable<ComponentEntity> {
        return this.http.post<ComponentEntity>('/api/component', data);
    }

    edit(data: ComponentEntity): Observable<ComponentEntity> {
        return this.http.put<ComponentEntity>('/api/component/edit', data);
    }

    getAll(): Observable<ComponentEntity[]> {
        return this.http.get<ComponentEntity[]>('/api/component');
    }

    getById(id: string | number): Observable<ComponentEntity> {
        return this.http.get<ComponentEntity>(`/api/component/${id}`);
    }

    remove(id: string | number): Observable<string> {
        return this.http.delete('/api/component/' + id, { responseType: 'text' });
    }

    exportData(): Observable<string> {
        return this.http.get('/api/exportComponents', { responseType: 'text' });
    }

    importData(data: { posts: ComponentEntity[] }): Observable<ComponentEntity[]> {
        return this.http.post<ComponentEntity[]>('/api/importComponents', data);
    }
}
