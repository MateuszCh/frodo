import { Directive, ElementRef, OnDestroy, OnInit, inject, output } from '@angular/core';

/**
 * Replaces listing-load.directive.js. Place on a sentinel element at the end of
 * a list; emits `reached` when it scrolls into view (load-more trigger).
 */
@Directive({
    selector: '[appInfiniteScroll]',
})
export class InfiniteScrollDirective implements OnInit, OnDestroy {
    private host = inject(ElementRef<HTMLElement>);
    readonly reached = output<void>();

    private observer?: IntersectionObserver;

    ngOnInit(): void {
        this.observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    this.reached.emit();
                }
            },
            { rootMargin: '200px' },
        );
        this.observer.observe(this.host.nativeElement);
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();
    }
}
