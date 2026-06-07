import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let router: Router;
    let navigateSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideLocationMocks(),
                provideHttpClient(withInterceptors([credentialsInterceptor])),
                provideHttpClientTesting(),
            ],
        });
        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
        navigateSpy = vi.spyOn(router, 'navigate');
    });

    afterEach(() => httpMock.verify());

    it('adds withCredentials: true to every outgoing request', () => {
        http.get('/api/test').subscribe();
        const req = httpMock.expectOne('/api/test');
        expect(req.request.withCredentials).toBe(true);
        req.flush({});
    });

    it('calls router.navigate(["/login"]) on a 401 response when not on /login', () => {
        let errored = false;
        http.get('/api/test').subscribe({ error: () => (errored = true) });
        httpMock.expectOne('/api/test').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        expect(navigateSpy).toHaveBeenCalledWith(['/login']);
        expect(errored).toBe(true);
    });

    it('does not navigate on a 401 when already on /login', () => {
        vi.spyOn(router, 'url', 'get').mockReturnValue('/login');
        http.get('/api/test').subscribe({ error: () => {} });
        httpMock.expectOne('/api/test').flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
        expect(navigateSpy).not.toHaveBeenCalled();
    });

    it('rethrows non-401 errors without navigating', () => {
        let status: number | undefined;
        http.get('/api/test').subscribe({ error: (e) => (status = e.status) });
        httpMock.expectOne('/api/test').flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
        expect(status).toBe(500);
        expect(navigateSpy).not.toHaveBeenCalled();
    });
});
