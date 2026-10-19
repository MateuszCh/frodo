import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../core/user.service';
import { PostTypesService } from '../../core/post-types.service';
import { injectRouteState } from '../../core/router-state';
import { ThemeService } from '../../core/theme.service';

interface NavItem {
    title: string;
    family: string;
    link: string;
}

/** Port of sidenav.component.js — main navigation menu. */
@Component({
    selector: 'app-sidenav',
    imports: [RouterLink, MatButtonModule],
    templateUrl: './sidenav.html',
})
export class SidenavComponent implements OnInit {
    protected userService = inject(UserService);
    private postTypesService = inject(PostTypesService);
    private router = inject(Router);
    protected route = injectRouteState();
    protected theme = inject(ThemeService);

    protected readonly postTypes = this.postTypesService.menu;
    protected readonly logoutStatus = signal(false);

    protected readonly navigation: NavItem[] = [
        { title: 'Pages', family: 'pages', link: '/pages' },
        { title: 'Components', family: 'components', link: '/components' },
        { title: 'Post Types', family: 'postTypes', link: '/post-types' },
        { title: 'Files', family: 'files', link: '/files' },
    ];

    ngOnInit(): void {
        this.postTypesService.refreshMenu();
    }

    logout(): void {
        this.logoutStatus.set(true);
        this.userService.logout().subscribe({
            next: () => {
                this.logoutStatus.set(false);
                this.router.navigate(['/login']);
            },
            error: (err) => {
                this.logoutStatus.set(false);
                console.error(err);
            },
        });
    }
}
