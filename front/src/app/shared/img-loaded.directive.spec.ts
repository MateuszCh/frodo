import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ImgLoadedDirective } from './img-loaded.directive';

@Component({
    selector: 'test-host',
    standalone: true,
    imports: [ImgLoadedDirective],
    template: `<div appImgLoaded><img src="test.jpg" /></div>`,
})
class HostWithImg {}

@Component({
    selector: 'test-host-no-img',
    standalone: true,
    imports: [ImgLoadedDirective],
    template: `<div appImgLoaded><span>no image</span></div>`,
})
class HostWithoutImg {}

describe('ImgLoadedDirective', () => {
    // ---- image that loads asynchronously (default JSDOM behaviour) -----------

    it('adds "img-loaded" class when the load event fires', () => {
        const fixture: ComponentFixture<HostWithImg> = TestBed.createComponent(HostWithImg);
        fixture.detectChanges();

        const host = fixture.nativeElement.querySelector('div') as HTMLDivElement;
        const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;

        expect(host.classList.contains('img-loaded')).toBe(false);

        img.dispatchEvent(new Event('load'));

        expect(host.classList.contains('img-loaded')).toBe(true);
    });

    // ---- image already loaded (complete + naturalWidth > 0) ------------------

    it('adds "img-loaded" class immediately when the image is already loaded', () => {
        const fixture: ComponentFixture<HostWithImg> = TestBed.createComponent(HostWithImg);

        const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
        Object.defineProperty(img, 'complete', { get: () => true, configurable: true });
        Object.defineProperty(img, 'naturalWidth', { get: () => 100, configurable: true });

        fixture.detectChanges(); // ngAfterViewInit runs

        const host = fixture.nativeElement.querySelector('div') as HTMLDivElement;
        expect(host.classList.contains('img-loaded')).toBe(true);
    });

    // ---- no img child --------------------------------------------------------

    it('does not throw when there is no img child', () => {
        expect(() => {
            const fixture = TestBed.createComponent(HostWithoutImg);
            fixture.detectChanges();
        }).not.toThrow();
    });

    // ---- cleanup on destroy --------------------------------------------------

    it('removes the load event listener on destroy', () => {
        const fixture: ComponentFixture<HostWithImg> = TestBed.createComponent(HostWithImg);
        fixture.detectChanges();

        const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
        const removeSpy = vi.spyOn(img, 'removeEventListener');

        fixture.destroy();

        expect(removeSpy).toHaveBeenCalledWith('load', expect.any(Function));
    });
});
