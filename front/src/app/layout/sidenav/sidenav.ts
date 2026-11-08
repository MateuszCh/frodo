import { Component, DOCUMENT, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { UserService } from '../../core/user.service';
import { PostTypesService } from '../../core/post-types.service';
import { injectRouteState } from '../../core/router-state';
import { ThemeService } from '../../core/theme.service';
import { LanguageSwitchComponent } from '../language-switch/language-switch';
import { I18nService } from '../../core/i18n/i18n.service';

/** localStorage keys: '1' once a group of the menu is opened; the groups start collapsed. */
const POSTS_OPEN_KEY = 'frodo.nav.postsOpen';
const ANALYTICS_OPEN_KEY = 'frodo.nav.analyticsOpen';

/** The subpages of Analytics in the menu, as its tabs (features/analytics). */
const ANALYTICS_ITEMS = [
    { section: 'overview', link: '/analytics', icon: 'i-chart' },
    { section: 'pages', link: '/analytics/pages', icon: 'i-layout' },
    { section: 'visitors', link: '/analytics/visitors', icon: 'i-user' },
] as const;
type AnalyticsSection = (typeof ANALYTICS_ITEMS)[number]['section'];

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
    protected readonly postsOpen = signal(this.readOpen(POSTS_OPEN_KEY));
    /** The current page belongs to one of the post types in the group. */
    protected readonly postsActive = computed(() => this.route().family === 'posts');

    /** The Analytics group: its subpages, opened and remembered like the post types. */
    protected readonly analyticsOpen = signal(this.readOpen(ANALYTICS_OPEN_KEY));
    protected readonly analyticsActive = computed(() => this.route().family === 'analytics');
    protected readonly analyticsItems = computed(() =>
        ANALYTICS_ITEMS.map((item) => ({ ...item, label: this.t(`analytics.section.${item.section}`) })),
    );
    /** The subpage shown, by the path of the URL (its query is the period). */
    protected readonly analyticsSection = computed<AnalyticsSection | null>(() => {
        if (!this.analyticsActive()) return null;
        const path = this.route().url.split(/[?#]/)[0];
        return ANALYTICS_ITEMS.find((item) => item.link === path)?.section ?? 'overview';
    });

    constructor() {
        // reaching a page of a group with the group collapsed (a link, the address bar)
        // opens it for this visit, without changing the remembered choice
        effect(() => {
            if (this.postsActive()) {
                untracked(() => this.postsOpen.set(true));
            }
        });
        effect(() => {
            if (this.analyticsActive()) {
                untracked(() => this.analyticsOpen.set(true));
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
        this.postsOpen.set(!this.postsOpen());
        this.saveOpen(POSTS_OPEN_KEY, this.postsOpen());
    }

    protected toggleAnalytics(): void {
        this.analyticsOpen.set(!this.analyticsOpen());
        this.saveOpen(ANALYTICS_OPEN_KEY, this.analyticsOpen());
    }

    private saveOpen(key: string, open: boolean): void {
        try {
            this.storage?.setItem(key, open ? '1' : '0');
        } catch {
            // storage unavailable (private mode): the choice lasts for this page only
        }
    }

    private readOpen(key: string): boolean {
        try {
            return this.storage?.getItem(key) === '1';
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
