import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Replaces the old request.service.js: every request carries the Passport
 * session cookie. A 401 redirects to the login screen (old states.run.js guard).
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const cloned = req.clone({ withCredentials: true });

    return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401 && !router.url.startsWith('/login')) {
                router.navigate(['/login']);
            }
            return throwError(() => error);
        }),
    );
};
