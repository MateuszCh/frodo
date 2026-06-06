import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { UserService } from '../user.service';

/**
 * Port of states.run.js global guard: verify the Passport session before
 * activating any protected route; otherwise redirect to /login.
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
    const userService = inject(UserService);
    const router = inject(Router);

    return userService.isAuthenticated().pipe(
        map(() => true),
        catchError(() => of(router.createUrlTree(['/login']))),
    );
};
