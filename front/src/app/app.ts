import { Component, computed, effect, inject, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenav, MatSidenavContent, MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HeaderComponent } from './layout/header/header';
import { SidenavComponent } from './layout/sidenav/sidenav';
import { LayoutService } from './core/layout.service';
import { injectRouteState } from './core/router-state';
import { registerAppIcons } from './core/icons';

@Component({
    selector: 'app-root',
    imports: [
        RouterOutlet,
        MatSidenavModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        HeaderComponent,
        SidenavComponent,
    ],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App {
    protected layout = inject(LayoutService);
    private route = injectRouteState();

    private sidenav = viewChild<MatSidenav>('sidenav');
    private content = viewChild.required(MatSidenavContent);

    protected readonly isLogin = computed(() => {
        console.log(this.route().url);
        return this.route().url.startsWith('/login');
    });
    protected readonly isDesktop = computed(() =>
        ['size-l', 'size-x', 'size-xl'].includes(this.layout.size()),
    );

    constructor() {
        registerAppIcons();

        // register the sidenav whenever it enters the DOM (it is removed on the login page)
        effect(() => {
            const sidenav = this.sidenav();
            if (sidenav) {
                this.layout.registerSidenav(sidenav);
            }
        });

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
