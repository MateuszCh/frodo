import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ParamMap } from '@angular/router';
import { Observable, of, tap } from 'rxjs';
import { VisitLive, VisitRange, VisitStats } from '../models/models';
import { readAnalyticsPrefs } from './analytics-prefs';

export { VISIT_PRESETS } from './analytics-prefs';
export type { VisitPreset } from './analytics-prefs';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** How long loaded statistics serve the other subpages. */
const REUSE_MS = 60 * 1000;

/**
 * The period of the report: a period of one's own from the URL (`?from&to`, two
 * "YYYY-MM-DD" days), or else the preset chosen last, which only localStorage keeps
 * (analytics-prefs.ts; 30 days at first).
 */
export function visitRangeOf(query: { from?: string | null; to?: string | null }): VisitRange {
    const { from, to } = query;
    if (from && to && DAY.test(from) && DAY.test(to)) {
        return { from, to };
    }
    return { period: readAnalyticsPrefs().period };
}

export function visitRangeFromParams(params: ParamMap): VisitRange {
    return visitRangeOf({ from: params.get('from'), to: params.get('to') });
}

/** Visit statistics of the public site (geosilesia writes them, the CMS only reads). */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
    private http = inject(HttpClient);

    /** the last statistics loaded, so switching between the subpages does not load them again */
    private last: { key: string; at: number; stats: VisitStats } | null = null;

    /**
     * The statistics of a period. The same period asked again within a minute (another
     * subpage of the tab) comes from the last load; a reload or a new period goes to the server.
     */
    visits(range: VisitRange, { reuse = true }: { reuse?: boolean } = {}): Observable<VisitStats> {
        const params =
            'period' in range
                ? new HttpParams().set('period', range.period)
                : new HttpParams().set('from', range.from).set('to', range.to);
        const key = params.toString();
        if (reuse && this.last?.key === key && Date.now() - this.last.at < REUSE_MS) {
            return of(this.last.stats);
        }
        return this.http
            .get<VisitStats>('/api/analytics/visits', { params })
            .pipe(tap((stats) => (this.last = { key, at: Date.now(), stats })));
    }

    /** Who is on the site now: the visitors of the last five minutes. */
    live(): Observable<VisitLive> {
        return this.http.get<VisitLive>('/api/analytics/live');
    }
}
