import { Component, computed, effect, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';
import { HeaderComponent } from './layout/header/header';
import { SidenavComponent } from './layout/sidenav/sidenav';
import { LayoutService } from './core/layout.service';
import { injectRouteState } from './core/router-state';

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        MatSidenavModule,
        HeaderComponent,
        SidenavComponent,
    ],
    templateUrl: './app.html',
})
export class App {
    protected layout = inject(LayoutService);
    private route = injectRouteState();

    private content = viewChild.required(MatSidenavContent);

    protected readonly isLogin = computed(() => {
        return this.route().url.startsWith('/login');
    });
    protected readonly isDesktop = computed(() =>
        ['size-l', 'size-x', 'size-xl'].includes(this.layout.size()),
    );

    constructor() {
        // close the over-mode sidenav after navigating on small screens
        effect(() => {
            this.route();
            if (!this.isDesktop()) {
                this.layout.closeSidenav();
            }
        });
    }

    onScroll(): void {
        const el = this.content().getElementRef().nativeElement;
        this.layout.scrolled.set(el.scrollTop > 0);
    }

    scrollTop(): void {
        this.content().scrollTo({ top: 0, behavior: 'smooth' });
    }
}
