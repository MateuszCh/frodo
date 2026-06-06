import { inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

/** Registers the legacy SVG icons (md.config.js $mdIconProvider) with Material. */
export function registerAppIcons(): void {
    const registry = inject(MatIconRegistry);
    const sanitizer = inject(DomSanitizer);

    const icons: Record<string, string> = {
        menu: 'images/menu.svg',
        arrow: 'images/arrow.svg',
        'arrow-black': 'images/arrow-black.svg',
        'arrow-down': 'images/arrow-down.svg',
        sort: 'images/sort.svg',
        'hand-white': 'images/hand-white.svg',
        'hand-black': 'images/hand-black.svg',
        close: 'images/close.svg',
        closeB: 'images/close-black.svg',
    };

    for (const [name, url] of Object.entries(icons)) {
        registry.addSvgIcon(name, sanitizer.bypassSecurityTrustResourceUrl(url));
    }
}
