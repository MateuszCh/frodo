import { DOCUMENT, Injectable, effect, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
    private document = inject(DOCUMENT);

    readonly size = signal(this.computeSize());
    readonly scrolled = signal(false);
    readonly hasFilters = signal(false);
    readonly sidenavOpen = signal(false);

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

    toggleSidenav(): void {
        this.sidenavOpen.update((v) => !v);
    }

    closeSidenav(): void {
        this.sidenavOpen.set(false);
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
