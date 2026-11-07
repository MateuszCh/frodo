import { Injectable, computed, signal } from '@angular/core';
import { Observable, defer, finalize } from 'rxjs';

/**
 * Requests the whole view waits for (a listing page): while any runs, the route loader
 * shows its veil and spinner, the same as during a navigation.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
    private readonly running = signal(0);
    readonly active = computed(() => this.running() > 0);

    /** Counts `source` as running from subscription until it completes, fails or is cancelled. */
    track<T>(source: Observable<T>): Observable<T> {
        return defer(() => {
            this.running.update((n) => n + 1);
            return source.pipe(finalize(() => this.running.update((n) => n - 1)));
        });
    }
}
