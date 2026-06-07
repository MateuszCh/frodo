import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { Observable, of, throwError } from 'rxjs';
import { UserService } from '../user.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
    const emptyRoute = {} as ActivatedRouteSnapshot;
    const emptyState = {} as RouterStateSnapshot;

    let userServiceMock: { isAuthenticated: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        userServiceMock = { isAuthenticated: vi.fn() };
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideLocationMocks(),
                { provide: UserService, useValue: userServiceMock },
            ],
        });
    });

    it('emits true when isAuthenticated() succeeds', () => {
        userServiceMock.isAuthenticated.mockReturnValue(of('ok'));
        let result: boolean | UrlTree | undefined;
        TestBed.runInInjectionContext(() =>
            (authGuard(emptyRoute, emptyState) as Observable<boolean | UrlTree>).subscribe(
                (v) => (result = v),
            ),
        );
        expect(result).toBe(true);
    });

    it('emits a UrlTree pointing to /login when isAuthenticated() errors', () => {
        userServiceMock.isAuthenticated.mockReturnValue(throwError(() => new Error('401')));
        let result: boolean | UrlTree | undefined;
        TestBed.runInInjectionContext(() =>
            (authGuard(emptyRoute, emptyState) as Observable<boolean | UrlTree>).subscribe(
                (v) => (result = v),
            ),
        );
        expect(result).toBeInstanceOf(UrlTree);
        const router = TestBed.inject(Router);
        expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    });
});
