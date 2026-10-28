import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { SettingsService } from './settings.service';
import { pageSettingsResolver, settingsResolver } from './resolvers';
import type { Settings } from '../models/models';

const makeSettings = (): Settings => ({
    pageTypes: [{ title: 'Mapa', type: 'map', fields: [{ title: 'Zoom', type: 'number', id: 'zoom' }] }],
});

describe('SettingsService', () => {
    let service: SettingsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [SettingsService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(SettingsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('get() sends GET /api/settings', () => {
        let result: Settings | undefined;
        service.get().subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/api/settings' }).flush(makeSettings());
        expect(result?.pageTypes[0].type).toBe('map');
    });

    it('pageSettingsResolver falls back to no page types when they cannot be loaded', () => {
        let result: Settings | undefined;
        TestBed.runInInjectionContext(() =>
            (pageSettingsResolver({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<Settings>)
                .subscribe((r) => (result = r)),
        );
        http.expectOne('/api/settings').flush('error', { status: 500, statusText: 'Server Error' });
        expect(result).toEqual({ pageTypes: [] });
    });

    it('settingsResolver does not hide a failed load (a save would replace the page types)', () => {
        let failed = false;
        TestBed.runInInjectionContext(() =>
            (settingsResolver({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<Settings>)
                .subscribe({ error: () => (failed = true) }),
        );
        http.expectOne('/api/settings').flush('error', { status: 500, statusText: 'Server Error' });
        expect(failed).toBe(true);
    });

    it('edit() sends PUT /api/settings with the settings', () => {
        const settings = makeSettings();
        let result: Settings | undefined;
        service.edit(settings).subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'PUT', url: '/api/settings' });
        expect(req.request.body).toEqual(settings);
        req.flush(settings);
        expect(result).toEqual(settings);
    });

    it('exportData() sends GET /api/exportSettings and returns the download path', () => {
        let result: string | undefined;
        service.exportData().subscribe((r) => (result = r));
        const req = http.expectOne({ method: 'GET', url: '/api/exportSettings' });
        expect(req.request.responseType).toBe('text');
        req.flush('/export/settings.json');
        expect(result).toBe('/export/settings.json');
    });
});
