import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { InfiniteScrollDirective } from './infinite-scroll.directive';

@Component({
    standalone: true,
    imports: [InfiniteScrollDirective],
    template: `<div appInfiniteScroll (reached)="onReached()"></div>`,
})
class HostComponent {
    onReached = vi.fn();
}

describe('InfiniteScrollDirective', () => {
    let observerCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;
    let mockObserver: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockObserver = { observe: vi.fn(), disconnect: vi.fn() };
        const mo = mockObserver;
        (globalThis as any).IntersectionObserver = vi.fn().mockImplementation(
            // must be a regular function (not arrow) to be usable as a constructor
            function (this: any, cb: (entries: Partial<IntersectionObserverEntry>[]) => void) {
                observerCallback = cb;
                Object.assign(this, mo);
            },
        );
    });

    afterEach(() => {
        delete (globalThis as any).IntersectionObserver;
    });

    function createFixture(): ComponentFixture<HostComponent> {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges(); // triggers ngOnInit
        return fixture;
    }

    it('creates an IntersectionObserver with rootMargin 200px and observes the host element', () => {
        const fixture = createFixture();
        expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), {
            rootMargin: '200px',
        });
        expect(mockObserver.observe).toHaveBeenCalledWith(
            fixture.nativeElement.querySelector('div'),
        );
    });

    it('emits "reached" when an entry is intersecting', () => {
        const fixture = createFixture();
        observerCallback([{ isIntersecting: true }]);
        expect(fixture.componentInstance.onReached).toHaveBeenCalled();
    });

    it('does not emit "reached" when no entry is intersecting', () => {
        const fixture = createFixture();
        observerCallback([{ isIntersecting: false }]);
        expect(fixture.componentInstance.onReached).not.toHaveBeenCalled();
    });

    it('disconnects the observer on destroy', () => {
        const fixture = createFixture();
        fixture.destroy();
        expect(mockObserver.disconnect).toHaveBeenCalled();
    });
});
