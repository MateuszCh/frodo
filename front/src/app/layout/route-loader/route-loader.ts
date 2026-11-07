import { Component, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
    NavigationCancel,
    NavigationEnd,
    NavigationError,
    NavigationSkipped,
    NavigationStart,
    Router,
} from '@angular/router';
import { combineLatest, distinctUntilChanged, filter, map, of, startWith, switchMap, timer } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { LoadingService } from '../../core/loading.service';

/** Navigations shorter than this (ms) show nothing, so quick ones do not flash. */
export const ROUTE_LOADER_DELAY = 150;

/**
 * A light veil over the whole window with a spinner in its middle while a navigation
 * runs its guards, resolvers and lazy chunks, or while a request of LoadingService runs
 * (a listing page). The host is a live region, so screen readers hear "Loading…" when it
 * appears.
 */
@Component({
    selector: 'app-route-loader',
    templateUrl: './route-loader.html',
    host: { role: 'status' },
})
export class RouteLoaderComponent {
    protected readonly t = inject(I18nService).t;

    // kept an observable: a navigation cancelled and replaced at once (a guard redirect)
    // must restart the delay, which a signal would merge away
    private readonly navigating$ = inject(Router).events.pipe(
        filter(
            (e) =>
                e instanceof NavigationStart ||
                e instanceof NavigationEnd ||
                e instanceof NavigationCancel ||
                e instanceof NavigationError ||
                e instanceof NavigationSkipped,
        ),
        map((e) => e instanceof NavigationStart),
        startWith(false),
    );
    private readonly loading$ = toObservable(inject(LoadingService).active);

    protected readonly visible = toSignal(
        combineLatest([this.navigating$, this.loading$]).pipe(
            map(([navigating, loading]) => navigating || loading),
            distinctUntilChanged(),
            switchMap((busy) => (busy ? timer(ROUTE_LOADER_DELAY).pipe(map(() => true)) : of(false))),
        ),
        { initialValue: false },
    );
}
