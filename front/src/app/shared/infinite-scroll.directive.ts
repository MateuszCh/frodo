import { DOCUMENT, Directive, ElementRef, OnDestroy, OnInit, inject, input, output } from '@angular/core';

/**
 * Replaces listing-load.directive.js. Place anywhere inside a scrolling list;
 * emits `reached` once its scroll container passes 80% (load-more trigger).
 *
 * The listener sits on the document in the capture phase: scroll events do not
 * bubble, but they do travel down the capture path, so this picks up whichever
 * ancestor actually scrolls at the current breakpoint without the template
 * having to know which one it is.
 */
@Directive({
    selector: '[appInfiniteScroll]',
})
export class InfiniteScrollDirective implements OnInit, OnDestroy {
    private host = inject(ElementRef<HTMLElement>);
    private document = inject(DOCUMENT);
    readonly reached = output<void>();
    enabled = input(true);

    private eventListener = (event: Event) => {
        if (!this.enabled()) {
            return;
        }
        const container = this.scrollContainer(event.target);
        if (container) {
            const scrollPercentage = Math.floor(
                (container.scrollTop / (container.scrollHeight - container.clientHeight)) * 100,
            );
            if (scrollPercentage > 80) {
                this.reached.emit();
            }
        }
    };

    ngOnInit(): void {
        this.document.addEventListener('scroll', this.eventListener, true);
    }

    ngOnDestroy(): void {
        this.document.removeEventListener('scroll', this.eventListener, true);
    }

    /** The scrolled element, but only when it is the one scrolling this directive. */
    private scrollContainer(target: EventTarget | null): HTMLElement | null {
        const scrolled = target === this.document ? this.document.scrollingElement : target;
        return scrolled instanceof HTMLElement && scrolled.contains(this.element) ? scrolled : null;
    }

    private get element(): HTMLElement {
        return this.host.nativeElement;
    }
}
