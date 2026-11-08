import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { Observable } from 'rxjs';
import { AnalyticsService, visitRangeOf } from './analytics.service';
import { analyticsResolver } from './resolvers';
import type { VisitStats } from '../models/models';

describe('visitRangeOf', () => {
    afterEach(() => localStorage.removeItem('frodo.analytics'));

    it('takes a period of its own from two days, or else the preset chosen last', () => {
        expect(visitRangeOf({ from: '2026-10-01', to: '2026-10-31' })).toEqual({ from: '2026-10-01', to: '2026-10-31' });
        expect(visitRangeOf({})).toEqual({ period: '30' });
        localStorage.setItem('frodo.analytics', JSON.stringify({ period: 'ytd' }));
        expect(visitRangeOf({})).toEqual({ period: 'ytd' });
        localStorage.setItem('frodo.analytics', JSON.stringify({ period: '12' }));
        expect(visitRangeOf({})).toEqual({ period: '30' });
        // a period needs both days in the YYYY-MM-DD format
        expect(visitRangeOf({ from: '2026-10-01' })).toEqual({ period: '30' });
        expect(visitRangeOf({ from: '1.10.2026', to: '2026-10-31' })).toEqual({ period: '30' });
    });

    it('keeps a preset remembered as a number of days', () => {
        localStorage.setItem('frodo.analytics', JSON.stringify({ days: 7 }));
        expect(visitRangeOf({})).toEqual({ period: '7' });
        localStorage.setItem('frodo.analytics', JSON.stringify({ days: 12 }));
        expect(visitRangeOf({})).toEqual({ period: '30' });
    });
});

describe('AnalyticsService', () => {
    let service: AnalyticsService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(AnalyticsService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        localStorage.removeItem('frodo.analytics');
    });

    it('visits() sends the preset or the period as the query', () => {
        service.visits({ period: '7' }).subscribe();
        http.expectOne({ method: 'GET', url: '/api/analytics/visits?period=7' }).flush({});
        service.visits({ from: '2026-10-01', to: '2026-10-31' }).subscribe();
        http.expectOne('/api/analytics/visits?from=2026-10-01&to=2026-10-31').flush({});
    });

    it('visits() reuses the last load of the same period for a minute, for the other subpages', () => {
        vi.useFakeTimers();
        try {
            let result: unknown;
            service.visits({ period: '7' }).subscribe();
            http.expectOne('/api/analytics/visits?period=7').flush({ from: 'a' });
            service.visits({ period: '7' }).subscribe((r) => (result = r));
            http.expectNone('/api/analytics/visits?period=7');
            expect(result).toEqual({ from: 'a' });

            // another period, a minute later, or asked not to reuse: loaded again
            service.visits({ period: '30' }).subscribe();
            http.expectOne('/api/analytics/visits?period=30').flush({});
            service.visits({ period: '30' }, { reuse: false }).subscribe();
            http.expectOne('/api/analytics/visits?period=30').flush({});
            vi.advanceTimersByTime(61 * 1000);
            service.visits({ period: '30' }).subscribe();
            http.expectOne('/api/analytics/visits?period=30').flush({});
        } finally {
            vi.useRealTimers();
        }
    });

    function resolve(query: Record<string, string>) {
        let result: VisitStats | null | undefined;
        const route = { queryParamMap: convertToParamMap(query) } as ActivatedRouteSnapshot;
        TestBed.runInInjectionContext(() =>
            (analyticsResolver(route, {} as RouterStateSnapshot) as Observable<VisitStats | null>).subscribe(
                (r) => (result = r),
            ),
        );
        return () => result;
    }

    it('analyticsResolver loads the period in the URL', () => {
        const result = resolve({ from: '2026-10-01', to: '2026-10-31' });
        http.expectOne('/api/analytics/visits?from=2026-10-01&to=2026-10-31').flush({ from: '2026-10-01' });
        expect(result()).toEqual({ from: '2026-10-01' });
    });

    it('analyticsResolver gives null when the statistics cannot be loaded, so the page still opens', () => {
        // the preset is not in the URL, only in localStorage
        localStorage.setItem('frodo.analytics', JSON.stringify({ period: 'today' }));
        const result = resolve({ period: '90' });
        http.expectOne('/api/analytics/visits?period=today').flush({ error: 'x' }, { status: 422, statusText: 'Unprocessable' });
        expect(result()).toBeNull();
    });
});
