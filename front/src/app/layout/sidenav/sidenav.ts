import { Component, DOCUMENT, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../core/user.service';
import { PostTypesService } from '../../core/post-types.service';
import { injectRouteState } from '../../core/router-state';
import { ThemeService } from '../../core/theme.service';
import { LanguageSwitchComponent } from '../language-switch/language-switch';
import { I18nService } from '../../core/i18n/i18n.service';

/** localStorage key: '1' once the "Posts" group of the menu is opened; it starts collapsed. */
const POSTS_OPEN_KEY = 'frodo.nav.postsOpen';

interface NavItem {
    title: string;
    family: string;
    link: string;
}

/** Port of sidenav.component.js — main navigation menu. */
@Component({
    selector: 'app-sidenav',
    imports: [RouterLink, MatButtonModule, LanguageSwitchComponent],
    templateUrl: './sidenav.html',
})
export class SidenavComponent implements OnInit {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    protected readonly locale = this.i18n.locale;
    protected userService = inject(UserService);
    private postTypesService = inject(PostTypesService);
    private router = inject(Router);
    protected route = injectRouteState();
    protected theme = inject(ThemeService);

    protected readonly postTypes = this.postTypesService.menu;
    protected readonly logoutStatus = signal(false);

    private readonly storage = inject(DOCUMENT).defaultView?.localStorage;
    /** The post types group of the menu is open (collapsed by default); the choice is remembered in localStorage. */
    protected readonly postsOpen = signal(this.readPostsOpen());
    /** The current page belongs to one of the post types in the group. */
    protected readonly postsActive = computed(() => this.route().family === 'posts');

    constructor() {
        // reaching a post type with the group collapsed (a link, the address bar) opens it
        // for this visit, without changing the remembered choice
        effect(() => {
            if (this.postsActive()) {
                untracked(() => this.postsOpen.set(true));
            }
        });
    }

    protected readonly navigation: NavItem[] = [
        { title: 'Pages', family: 'pages', link: '/pages' },
        { title: 'Components', family: 'components', link: '/components' },
        { title: 'Post Types', family: 'postTypes', link: '/post-types' },
        { title: 'Files', family: 'files', link: '/files' },
    ];

    ngOnInit(): void {
        this.postTypesService.refreshMenu();
    }

    protected togglePosts(): void {
        const open = !this.postsOpen();
        this.postsOpen.set(open);
        try {
            this.storage?.setItem(POSTS_OPEN_KEY, open ? '1' : '0');
        } catch {
            // storage unavailable (private mode): the choice lasts for this page only
        }
    }

    private readPostsOpen(): boolean {
        try {
            return this.storage?.getItem(POSTS_OPEN_KEY) === '1';
        } catch {
            return false;
        }
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
