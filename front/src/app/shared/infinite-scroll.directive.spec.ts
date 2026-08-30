import { Component, signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { InfiniteScrollDirective } from './infinite-scroll.directive';

@Component({
    standalone: true,
    imports: [InfiniteScrollDirective],
    template: `
        <div class="outer">
            <div class="inner" appInfiniteScroll [enabled]="enabled()" (reached)="onReached()"></div>
        </div>
        <div class="unrelated"></div>
    `,
})
class HostComponent {
    readonly enabled = signal(true);
    onReached = vi.fn();
}

describe('InfiniteScrollDirective', () => {
    /** jsdom does no layout, so the scroll geometry has to be faked. */
    function setGeometry(
        el: HTMLElement,
        geometry: { scrollTop: number; scrollHeight: number; clientHeight: number },
    ): void {
        for (const [prop, value] of Object.entries(geometry)) {
            Object.defineProperty(el, prop, { value, configurable: true });
        }
    }

    function createFixture(): {
        fixture: ComponentFixture<HostComponent>;
        el: HTMLElement;
        outer: HTMLElement;
        unrelated: HTMLElement;
    } {
        const fixture = TestBed.createComponent(HostComponent);
        fixture.detectChanges(); // triggers ngOnInit → addEventListener
        const query = (selector: string): HTMLElement =>
            fixture.nativeElement.querySelector(selector);
        return {
            fixture,
            el: query('.inner'),
            outer: query('.outer'),
            unrelated: query('.unrelated'),
        };
    }

    /** Fakes the geometry of `el` and dispatches a scroll event on it. */
    function scrollToBottom(el: HTMLElement): void {
        setGeometry(el, { scrollTop: 950, scrollHeight: 1100, clientHeight: 100 });
        el.dispatchEvent(new Event('scroll'));
    }

    it('emits "reached" when scrolled past 80% of the scrollable height', () => {
        const { fixture, el } = createFixture();
        setGeometry(el, { scrollTop: 850, scrollHeight: 1100, clientHeight: 100 });
        el.dispatchEvent(new Event('scroll'));
        expect(fixture.componentInstance.onReached).toHaveBeenCalled();
    });

    it('does not emit "reached" below 80%', () => {
        const { fixture, el } = createFixture();
        setGeometry(el, { scrollTop: 500, scrollHeight: 1100, clientHeight: 100 });
        el.dispatchEvent(new Event('scroll'));
        expect(fixture.componentInstance.onReached).not.toHaveBeenCalled();
    });

    it('does not emit "reached" exactly at 80%', () => {
        const { fixture, el } = createFixture();
        setGeometry(el, { scrollTop: 800, scrollHeight: 1100, clientHeight: 100 });
        el.dispatchEvent(new Event('scroll'));
        expect(fixture.componentInstance.onReached).not.toHaveBeenCalled();
    });

    it('does not emit "reached" while disabled', () => {
        const { fixture, el } = createFixture();
        fixture.componentInstance.enabled.set(false);
        fixture.detectChanges();
        setGeometry(el, { scrollTop: 950, scrollHeight: 1100, clientHeight: 100 });
        el.dispatchEvent(new Event('scroll'));
        expect(fixture.componentInstance.onReached).not.toHaveBeenCalled();
    });

    it('emits again once re-enabled', () => {
        const { fixture, el } = createFixture();
        fixture.componentInstance.enabled.set(false);
        fixture.detectChanges();
        setGeometry(el, { scrollTop: 950, scrollHeight: 1100, clientHeight: 100 });
        el.dispatchEvent(new Event('scroll'));

        fixture.componentInstance.enabled.set(true);
        fixture.detectChanges();
        el.dispatchEvent(new Event('scroll'));
        expect(fixture.componentInstance.onReached).toHaveBeenCalledTimes(1);
    });

    it('emits when an ancestor is the element that scrolls', () => {
        const { fixture, outer } = createFixture();
        scrollToBottom(outer);
        expect(fixture.componentInstance.onReached).toHaveBeenCalled();
    });

    it('ignores scrolling of an element that does not contain the host', () => {
        const { fixture, unrelated } = createFixture();
        scrollToBottom(unrelated);
        expect(fixture.componentInstance.onReached).not.toHaveBeenCalled();
    });

    it('does not emit when the element cannot scroll', () => {
        const { fixture, el } = createFixture();
        setGeometry(el, { scrollTop: 0, scrollHeight: 100, clientHeight: 100 });
        el.dispatchEvent(new Event('scroll'));
        expect(fixture.componentInstance.onReached).not.toHaveBeenCalled();
    });

    it('removes the scroll listener on destroy', () => {
        const { fixture, el } = createFixture();
        const comp = fixture.componentInstance;
        setGeometry(el, { scrollTop: 950, scrollHeight: 1100, clientHeight: 100 });
        fixture.destroy();
        el.dispatchEvent(new Event('scroll'));
        expect(comp.onReached).not.toHaveBeenCalled();
    });
});
