import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import {
    analyticsResolver,
    componentResolver,
    componentsResolver,
    existResolver,
    filesResolver,
    listingResolver,
    pageResolver,
    pageSettingsResolver,
    postResolver,
    postTypeByIdResolver,
    postTypeResolver,
    settingsResolver,
    userResolver,
} from './core/resolvers';

// Port of config/router.states.config.js (UI Router states -> Angular routes).
export const routes: Routes = [
    // Pages family
    {
        path: '',
        pathMatch: 'full',
        canActivate: [authGuard],
        data: { family: 'pages', title: 'pages' },
        resolve: { listing: listingResolver },
        loadComponent: () =>
            import('./features/listing/listing/listing').then((m) => m.ListingComponent),
    },
    {
        path: 'pages',
        canActivate: [authGuard],
        data: { family: 'pages', title: 'pages' },
        resolve: { listing: listingResolver },
        loadComponent: () =>
            import('./features/listing/listing/listing').then((m) => m.ListingComponent),
    },
    {
        path: 'pages/add',
        canActivate: [authGuard],
        data: { family: 'pages' },
        resolve: { components: componentsResolver, settings: pageSettingsResolver },
        loadComponent: () => import('./features/pages/page/page').then((m) => m.PageComponent),
    },
    {
        path: 'pages/edit/:id',
        canActivate: [authGuard],
        data: { family: 'pages' },
        resolve: { components: componentsResolver, settings: pageSettingsResolver, page: pageResolver },
        loadComponent: () => import('./features/pages/page/page').then((m) => m.PageComponent),
    },

    // Posts family
    {
        path: 'posts/:type/add',
        canActivate: [authGuard],
        data: { family: 'posts' },
        resolve: { postType: postTypeResolver },
        loadComponent: () => import('./features/posts/post').then((m) => m.PostComponent),
    },
    {
        path: 'posts/:type/edit/:id',
        canActivate: [authGuard],
        data: { family: 'posts' },
        resolve: { postType: postTypeResolver, post: postResolver },
        loadComponent: () => import('./features/posts/post').then((m) => m.PostComponent),
    },
    {
        path: 'posts/:type',
        canActivate: [authGuard],
        data: { family: 'posts' },
        resolve: { model: postTypeResolver, listing: listingResolver },
        loadComponent: () =>
            import('./features/listing/listing/listing').then((m) => m.ListingComponent),
    },

    // Post types family
    {
        path: 'post-types',
        canActivate: [authGuard],
        data: { family: 'postTypes', title: 'post types' },
        resolve: { listing: listingResolver },
        loadComponent: () =>
            import('./features/listing/listing/listing').then((m) => m.ListingComponent),
    },
    {
        path: 'post-types/add',
        canActivate: [authGuard],
        data: { family: 'postTypes' },
        loadComponent: () =>
            import('./features/post-types/post-type/post-type').then((m) => m.PostTypeComponent),
    },
    {
        path: 'post-types/edit/:id',
        canActivate: [authGuard],
        data: { family: 'postTypes' },
        resolve: { postType: postTypeByIdResolver },
        loadComponent: () =>
            import('./features/post-types/post-type/post-type').then((m) => m.PostTypeComponent),
    },

    // Components family (shares the post-type editor)
    {
        path: 'components',
        canActivate: [authGuard],
        data: { family: 'components', title: 'components' },
        resolve: { listing: listingResolver },
        loadComponent: () =>
            import('./features/listing/listing/listing').then((m) => m.ListingComponent),
    },
    {
        path: 'components/add',
        canActivate: [authGuard],
        data: { family: 'components' },
        loadComponent: () =>
            import('./features/post-types/post-type/post-type').then((m) => m.PostTypeComponent),
    },
    {
        path: 'components/edit/:id',
        canActivate: [authGuard],
        data: { family: 'components' },
        resolve: { postType: componentResolver },
        loadComponent: () =>
            import('./features/post-types/post-type/post-type').then((m) => m.PostTypeComponent),
    },

    // Files
    {
        path: 'files',
        canActivate: [authGuard],
        data: { family: 'files' },
        resolve: { allFiles: filesResolver },
        loadComponent: () => import('./features/files/files/files').then((m) => m.FilesComponent),
    },

    // Settings (page types and their fields)
    {
        path: 'settings',
        canActivate: [authGuard],
        data: { family: 'settings' },
        resolve: { settings: settingsResolver },
        loadComponent: () => import('./features/settings/settings/settings').then((m) => m.SettingsComponent),
    },

    // Analytics (visit statistics of the public site): three subpages with tabs, one
    // component. A new period is a new query, or a reload of the same URL for a preset
    // (kept in localStorage only).
    ...(['overview', 'pages', 'visitors'] as const).map((section) => ({
        path: section === 'overview' ? 'analytics' : `analytics/${section}`,
        canActivate: [authGuard],
        data: { family: 'analytics', section },
        runGuardsAndResolvers: 'always' as const,
        resolve: { stats: analyticsResolver },
        loadComponent: () => import('./features/analytics/analytics/analytics').then((m) => m.AnalyticsComponent),
    })),

    // Auth / misc
    {
        path: 'login',
        resolve: { exist: existResolver },
        loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent),
    },
    {
        path: 'account',
        canActivate: [authGuard],
        resolve: { user: userResolver },
        loadComponent: () =>
            import('./features/auth/account/account').then((m) => m.AccountComponent),
    },
    {
        path: '**',
        loadComponent: () => import('./features/error/error').then((m) => m.ErrorComponent),
    },
];
