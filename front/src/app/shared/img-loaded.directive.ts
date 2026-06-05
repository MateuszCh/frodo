import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

@Directive({ selector: '[appImgLoaded]' })
export class ImgLoadedDirective implements AfterViewInit, OnDestroy {
    private host = inject(ElementRef<HTMLElement>);
    private img?: HTMLImageElement;
    private readonly onLoad = () => this.host.nativeElement.classList.add('img-loaded');

    ngAfterViewInit(): void {
        const img = this.host.nativeElement.querySelector('img') as HTMLImageElement | null;
        if (!img) return;
        this.img = img;
        if (img.complete && img.naturalWidth > 0) {
            this.host.nativeElement.classList.add('img-loaded');
        } else {
            img.addEventListener('load', this.onLoad);
        }
    }

    ngOnDestroy(): void {
        this.img?.removeEventListener('load', this.onLoad);
    }
}
