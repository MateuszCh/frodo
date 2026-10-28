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
import { ComponentEntity, FileItem, Page, Post, PostType, Settings, User } from '../models/models';

// Port of constants/promises.states.constant.js (statePromises).

export const pagesResolver: ResolveFn<Page[]> = () => inject(PagesService).getAll();

// the page editor loads all components anyway: keep them for "component" fields too
export const componentsResolver: ResolveFn<ComponentEntity[]> = () => {
    const componentsService = inject(ComponentsService);
    return componentsService.getAll().pipe(tap((components) => componentsService.setList(components)));
};

export const postTypesResolver: ResolveFn<PostType[]> = () => inject(PostTypesService).getAll();

export const pageResolver: ResolveFn<Page> = (route: ActivatedRouteSnapshot) =>
    inject(PagesService).getById(route.paramMap.get('id')!);

export const postTypeWithPostsResolver: ResolveFn<PostType> = (route: ActivatedRouteSnapshot) =>
    inject(PostTypesService).getByTypeWithPosts(route.paramMap.get('type')!);

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
