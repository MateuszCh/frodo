import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';
import type { MatSidenav } from '@angular/material/sidenav';

/**
 * Port of MainController (responsive `size-*` class on <body>) + page-body
 * sidenav/filters orchestration. The shell registers its MatSidenav instances
 * so header/listing can toggle them.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
    private document = inject(DOCUMENT);

    readonly size = signal(this.computeSize());
    readonly scrolled = signal(false);
    /** true while the current route is the posts listing (has filters). */
    readonly hasFilters = signal(false);

    private sidenav?: MatSidenav;

    constructor() {
        const win = this.document.defaultView;
        if (win) {
            let raf = 0;
            win.addEventListener('resize', () => {
                cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => this.size.set(this.computeSize()));
            });
        }
        // keep the responsive class on <body> in sync (legacy ng-class="size")
        effect(() => {
            const body = this.document.body;
            body.classList.remove('size-s', 'size-m', 'size-l', 'size-x', 'size-xl');
            body.classList.add(this.size());
        });
    }

    registerSidenav(sidenav: MatSidenav): void {
        this.sidenav = sidenav;
    }

    toggleSidenav(): void {
        this.sidenav?.toggle();
    }

    closeSidenav(): void {
        this.sidenav?.close();
    }

    private computeSize(): string {
        const width = this.document.defaultView?.innerWidth ?? 1280;
        if (width < 600) return 'size-s';
        if (width < 960) return 'size-m';
        if (width < 1280) return 'size-l';
        if (width < 1921) return 'size-x';
        return 'size-xl';
    }
}
