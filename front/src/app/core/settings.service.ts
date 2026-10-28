import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Settings } from '../models/models';

/** Site-wide configuration: the page types and their fields. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
    private http = inject(HttpClient);

    get(): Observable<Settings> {
        return this.http.get<Settings>('/api/settings');
    }

    edit(data: Settings): Observable<Settings> {
        return this.http.put<Settings>('/api/settings', data);
    }

    /** Writes the export of the page types on the server; resolves to its download path. */
    exportData(): Observable<string> {
        return this.http.get('/api/exportSettings', { responseType: 'text' });
    }
}
