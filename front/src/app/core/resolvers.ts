import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { PagesService } from './pages.service';
import { PostsService } from './posts.service';
import { PostTypesService } from './post-types.service';
import { ComponentsService } from './components.service';
import { FilesService } from './files.service';
import { UserService } from './user.service';
import { SettingsService } from './settings.service';
import { AnalyticsService, visitRangeFromParams } from './analytics.service';
import { ListingFamily, ListingPage, ListingService } from './listing.service';
import { listingKey, readPageSize, readSort } from '../features/listing/listing-filter';
import { ComponentEntity, FileItem, Page, Post, PostType, Settings, User, VisitStats } from '../models/models';

// Port of constants/promises.states.constant.js (statePromises).

// the page editor loads all components anyway: keep them for "component" fields too
export const componentsResolver: ResolveFn<ComponentEntity[]> = () => {
    const componentsService = inject(ComponentsService);
    return componentsService.getAll().pipe(tap((components) => componentsService.setList(components)));
};

/** A page number from the URL (`?page=N`): anything else is the first page. */
export function parsePage(value: string | number | null | undefined): number {
    const page = Number(value);
    return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * The listing page in the URL (`?page=N`), with the page size and sort kept for that
 * listing, so the list shows at once. Later pages, searches and filters are loaded by
 * the listing itself.
 */
export const listingResolver: ResolveFn<ListingPage> = (route: ActivatedRouteSnapshot) => {
    const family = route.data['family'] as ListingFamily;
    const postType = route.paramMap.get('type') ?? undefined;
    const key = listingKey(family, postType);
    return inject(ListingService).query(family, {
        postType,
        page: parsePage(route.queryParamMap.get('page')),
        limit: readPageSize(key),
        sort: readSort(key),
    });
};

export const pageResolver: ResolveFn<Page> = (route: ActivatedRouteSnapshot) =>
    inject(PagesService).getById(route.paramMap.get('id')!);

export const postTypeResolver: ResolveFn<PostType> = (route: ActivatedRouteSnapshot) =>
    inject(PostTypesService).getByType(route.paramMap.get('type')!);

export const postTypeByIdResolver: ResolveFn<PostType> = (route: ActivatedRouteSnapshot) =>
    inject(PostTypesService).getById(route.paramMap.get('id')!);

export const componentResolver: ResolveFn<ComponentEntity> = (route: ActivatedRouteSnapshot) =>
    inject(ComponentsService).getById(route.paramMap.get('id')!);

export const postResolver: ResolveFn<Post> = (route: ActivatedRouteSnapshot) =>
    inject(PostsService).getById(route.paramMap.get('id')!);

export const filesResolver: ResolveFn<FileItem[]> = () => inject(FilesService).getAllFiles();

export const existResolver: ResolveFn<boolean> = () => inject(UserService).exist();

export const userResolver: ResolveFn<User> = () => inject(UserService).fetchUser();

// The settings view must not open without them: a save would replace the page types.
export const settingsResolver: ResolveFn<Settings> = () => inject(SettingsService).get();

// The page editor works without page types: if they cannot be loaded it opens without them,
// and the server keeps the page's type and values (it checks them on save).
export const pageSettingsResolver: ResolveFn<Settings> = () =>
    inject(SettingsService)
        .get()
        .pipe(catchError(() => of({ pageTypes: [] })));

/**
 * Visit statistics of the period in the URL (`?days` or `?from&to`). A failed load gives
 * null: the page still opens, with its period switch, and says the statistics are missing.
 */
export const analyticsResolver: ResolveFn<VisitStats | null> = (route: ActivatedRouteSnapshot) =>
    inject(AnalyticsService)
        .visits(visitRangeFromParams(route.queryParamMap))
        .pipe(catchError(() => of(null)));
