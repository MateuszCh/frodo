import { TestBed, ComponentFixture } from '@angular/core/testing';
import {
    Event,
    NavigationCancel,
    NavigationEnd,
    NavigationError,
    NavigationSkipped,
    NavigationStart,
    Router,
} from '@angular/router';
import { Subject } from 'rxjs';

import { ROUTE_LOADER_DELAY, RouteLoaderComponent } from './route-loader';

beforeEach(() => {
    localStorage.setItem('frodo.lang', 'en');
    vi.useFakeTimers();
});
afterEach(() => {
    localStorage.removeItem('frodo.lang');
    vi.useRealTimers();
});

function setup() {
    const events = new Subject<Event>();
    TestBed.configureTestingModule({
        imports: [RouteLoaderComponent],
        providers: [{ provide: Router, useValue: { events } }],
    });
    const fixture: ComponentFixture<RouteLoaderComponent> =
        TestBed.createComponent(RouteLoaderComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const emit = (event: Event) => {
        events.next(event);
        fixture.detectChanges();
    };
    const wait = (ms: number) => {
        vi.advanceTimersByTime(ms);
        fixture.detectChanges();
    };
    const overlay = () => el.querySelector('.route-loader');
    return { el, emit, wait, overlay };
}

const start = () => new NavigationStart(1, '/files');

describe('RouteLoaderComponent', () => {
    it('is a live region and shows nothing before any navigation', () => {
        const { el, overlay } = setup();
        expect(el.getAttribute('role')).toBe('status');
        expect(overlay()).toBeNull();
    });

    it('shows the veil with a spinner once a navigation takes longer than the delay', () => {
        const { emit, wait, overlay } = setup();
        emit(start());
        wait(ROUTE_LOADER_DELAY - 1);
        expect(overlay()).toBeNull();

        wait(1);
        expect(overlay()?.querySelector('.spinner')).not.toBeNull();
        expect(overlay()?.textContent?.trim()).toBe('Loading…');

        emit(new NavigationEnd(1, '/files', '/files'));
        expect(overlay()).toBeNull();
    });

    it('never shows for a navigation that ends before the delay', () => {
        const { emit, wait, overlay } = setup();
        emit(start());
        wait(ROUTE_LOADER_DELAY / 2);
        emit(new NavigationEnd(1, '/files', '/files'));
        wait(ROUTE_LOADER_DELAY * 2);
        expect(overlay()).toBeNull();
    });

    for (const [name, end] of [
        ['cancelled', () => new NavigationCancel(1, '/files', 'guard')],
        ['failed', () => new NavigationError(1, '/files', new Error('resolver'))],
        ['skipped', () => new NavigationSkipped(1, '/files', 'same url')],
    ] as const) {
        it(`hides when the navigation is ${name}`, () => {
            const { emit, wait, overlay } = setup();
            emit(start());
            wait(ROUTE_LOADER_DELAY);
            expect(overlay()).not.toBeNull();
            emit(end());
            expect(overlay()).toBeNull();
        });
    }

    it('restarts the delay for a navigation that follows a cancelled one (guard redirect)', () => {
        const { emit, wait, overlay } = setup();
        emit(start());
        wait(ROUTE_LOADER_DELAY - 10);
        emit(new NavigationCancel(1, '/files', 'redirect'));
        emit(new NavigationStart(2, '/login'));
        wait(ROUTE_LOADER_DELAY - 10);
        expect(overlay()).toBeNull();
        wait(10);
        expect(overlay()).not.toBeNull();
    });
});
