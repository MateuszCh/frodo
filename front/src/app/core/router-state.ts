import { DOCUMENT, Signal, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map, skip } from 'rxjs';

/**
 * Scrolls `target` back to the top after every navigation. The app scrolls #scroll
 * (mat-sidenav-content), not the window, so the router's own scroll handling never
 * reaches it. The first navigation is skipped: the page opens at the top anyway, and
 * the view holding `target` may not exist yet.
 */
export function scrollToTopOnNavigation(target: () => { scrollTo(options: ScrollToOptions): void }): void {
    inject(Router)
        .events.pipe(
            filter((e) => e instanceof NavigationEnd),
            skip(1),
            takeUntilDestroyed(),
        )
        .subscribe(() => target().scrollTo({ top: 0, behavior: 'instant' }));
}

export interface RouteState {
    family?: string;
    type?: string;
    url: string;
}

/** Reads the leaf route's `family` data + `type` param on every navigation. */
export function injectRouteState(): Signal<RouteState> {
    const router = inject(Router);
    const route = inject(ActivatedRoute);
    const document = inject(DOCUMENT);

    // On a page refresh the initial navigation has not completed yet, so
    // `router.url` is still '/'. Use the real browser path as the initial value
    // so route-dependent UI (e.g. the login page) is correct before the first
    // NavigationEnd fires.
    const initialUrl = document.location ? document.location.pathname + document.location.search : router.url;

    // Read family/type from the current snapshot so components created after
    // NavigationEnd (e.g. sidenav after login redirect) get the correct
    // active state without waiting for the next navigation.
    let initialLeaf = route.snapshot;
    while (initialLeaf.firstChild) {
        initialLeaf = initialLeaf.firstChild;
    }

    return toSignal(
        router.events.pipe(
            filter((e) => e instanceof NavigationEnd),
            map(() => {
                let leaf = route.snapshot;
                while (leaf.firstChild) {
                    leaf = leaf.firstChild;
                }
                return {
                    family: leaf.data['family'] as string | undefined,
                    type: leaf.paramMap.get('type') ?? undefined,
                    url: router.url,
                };
            }),
        ),
        {
            initialValue: {
                family: initialLeaf.data['family'] as string | undefined,
                type: initialLeaf.paramMap.get('type') ?? undefined,
                url: initialUrl,
            },
        },
    );
}
