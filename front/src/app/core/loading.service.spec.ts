import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
    let service: LoadingService;
    beforeEach(() => (service = TestBed.inject(LoadingService)));

    it('is active while a tracked request runs, not before it is subscribed', () => {
        const source = new Subject<number>();
        const tracked = service.track(source);
        expect(service.active()).toBe(false);
        const sub = tracked.subscribe();
        expect(service.active()).toBe(true);
        source.next(1);
        expect(service.active()).toBe(true);
        source.complete();
        expect(service.active()).toBe(false);
        sub.unsubscribe();
    });

    it('stops counting a request that fails or is cancelled', () => {
        service.track(throwError(() => new Error('x'))).subscribe({ error: () => {} });
        expect(service.active()).toBe(false);
        const sub = service.track(new Subject()).subscribe();
        expect(service.active()).toBe(true);
        sub.unsubscribe();
        expect(service.active()).toBe(false);
    });

    it('stays active until the last of several requests ends', () => {
        const first = new Subject<void>();
        service.track(first).subscribe();
        service.track(of(1)).subscribe();
        expect(service.active()).toBe(true);
        first.complete();
        expect(service.active()).toBe(false);
    });
});
