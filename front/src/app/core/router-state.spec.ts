import { TestBed } from '@angular/core/testing';
import { Event, NavigationCancel, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { scrollToTopOnNavigation } from './router-state';

function setup() {
    const events = new Subject<Event>();
    TestBed.configureTestingModule({
        providers: [{ provide: Router, useValue: { events } }],
    });
    const scroller = { scrollTo: vi.fn() };
    TestBed.runInInjectionContext(() => scrollToTopOnNavigation(() => scroller));
    return { events, scroller };
}

const end = (id: number, url: string) => new NavigationEnd(id, url, url);

describe('scrollToTopOnNavigation', () => {
    it('leaves the first page alone: it opens at the top anyway', () => {
        const { events, scroller } = setup();
        events.next(end(1, '/'));
        expect(scroller.scrollTo).not.toHaveBeenCalled();
    });

    it('scrolls back to the top, instantly, after every following navigation', () => {
        const { events, scroller } = setup();
        events.next(end(1, '/'));
        events.next(end(2, '/files'));
        events.next(end(3, '/posts/news'));
        expect(scroller.scrollTo).toHaveBeenCalledTimes(2);
        expect(scroller.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    });

    it('does not scroll for navigations that start or get cancelled', () => {
        const { events, scroller } = setup();
        events.next(end(1, '/'));
        events.next(new NavigationStart(2, '/files'));
        events.next(new NavigationCancel(2, '/files', 'guard'));
        expect(scroller.scrollTo).not.toHaveBeenCalled();
    });

    it('stops listening once its injector is destroyed', () => {
        const { events, scroller } = setup();
        events.next(end(1, '/'));
        TestBed.resetTestingModule();
        events.next(end(2, '/files'));
        expect(scroller.scrollTo).not.toHaveBeenCalled();
    });
});
