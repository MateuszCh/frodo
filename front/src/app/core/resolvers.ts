import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { PagesService } from './pages.service';
import { PostsService } from './posts.service';
import { PostTypesService } from './post-types.service';
import { ComponentsService } from './components.service';
import { FilesService } from './files.service';
import { UserService } from './user.service';
import { ComponentEntity, FileItem, Page, Post, PostType, User } from '../models/models';

// Port of constants/promises.states.constant.js (statePromises).

export const pagesResolver: ResolveFn<Page[]> = () => inject(PagesService).getAll();

export const componentsResolver: ResolveFn<ComponentEntity[]> = () =>
    inject(ComponentsService).getAll();

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
