import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    NavigationCancel,
    NavigationEnd,
    NavigationError,
    NavigationSkipped,
    NavigationStart,
    Router,
} from '@angular/router';
import { distinctUntilChanged, filter, map, of, switchMap, timer } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';

/** Navigations shorter than this (ms) show nothing, so quick ones do not flash. */
export const ROUTE_LOADER_DELAY = 150;

/**
 * A light veil over the whole window with a spinner in its middle while a navigation
 * runs its guards, resolvers and lazy chunks. The host is a live region, so screen
 * readers hear "Loading…" when it appears.
 */
@Component({
    selector: 'app-route-loader',
    templateUrl: './route-loader.html',
    host: { role: 'status' },
})
export class RouteLoaderComponent {
    protected readonly t = inject(I18nService).t;

    protected readonly visible = toSignal(
        inject(Router).events.pipe(
            filter(
                (e) =>
                    e instanceof NavigationStart ||
                    e instanceof NavigationEnd ||
                    e instanceof NavigationCancel ||
                    e instanceof NavigationError ||
                    e instanceof NavigationSkipped,
            ),
            map((e) => e instanceof NavigationStart),
            distinctUntilChanged(),
            switchMap((loading) =>
                loading ? timer(ROUTE_LOADER_DELAY).pipe(map(() => true)) : of(false),
            ),
        ),
        { initialValue: false },
    );
}
