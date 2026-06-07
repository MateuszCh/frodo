import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';

describe('UserService', () => {
    let service: UserService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [UserService, provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(UserService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    // ---- initial state -------------------------------------------------------

    it('starts with an anonymous user and isLogged = false', () => {
        expect(service.user().logged).toBe(0);
        expect(service.isLogged()).toBe(false);
    });

    // ---- setUser / clear -----------------------------------------------------

    describe('setUser() / clear()', () => {
        it('setUser() updates the user signal', () => {
            service.setUser('alice', 42, 1);
            expect(service.user().username).toBe('alice');
            expect(service.user().id).toBe(42);
            expect(service.user().logged).toBe(1);
        });

        it('isLogged is true when logged > 0', () => {
            service.setUser('alice', 1, 1);
            expect(service.isLogged()).toBe(true);
        });

        it('clear() resets the signal and isLogged becomes false', () => {
            service.setUser('alice', 1, 1);
            service.clear();
            expect(service.user().username).toBeUndefined();
            expect(service.isLogged()).toBe(false);
        });
    });

    // ---- login() -------------------------------------------------------------

    describe('login()', () => {
        it('sends POST /user/login with the payload', () => {
            service.login({ username: 'alice', password: 'secret' }).subscribe();
            const req = http.expectOne({ method: 'POST', url: '/user/login' });
            expect(req.request.body).toEqual({ username: 'alice', password: 'secret' });
            req.flush({ username: 'alice', id: 1 });
        });

        it('updates the user signal and sets isLogged to true on success', () => {
            service.login({ username: 'alice', password: 'secret' }).subscribe();
            http.expectOne('/user/login').flush({ username: 'alice', id: 7 });
            expect(service.user().username).toBe('alice');
            expect(service.isLogged()).toBe(true);
        });
    });

    // ---- logout() ------------------------------------------------------------

    describe('logout()', () => {
        it('sends GET /user/logout', () => {
            service.logout().subscribe();
            const req = http.expectOne({ method: 'GET', url: '/user/logout' });
            expect(req.request.responseType).toBe('text');
            req.flush('ok');
        });

        it('clears the user signal on success', () => {
            service.setUser('alice', 1, 1);
            service.logout().subscribe();
            http.expectOne('/user/logout').flush('ok');
            expect(service.isLogged()).toBe(false);
        });
    });

    // ---- fetchUser() ---------------------------------------------------------

    describe('fetchUser()', () => {
        it('sends GET /user', () => {
            service.fetchUser().subscribe();
            http.expectOne({ method: 'GET', url: '/user' }).flush({ username: 'bob', id: 2 });
        });

        it('updates the signal when the response has a username', () => {
            service.fetchUser().subscribe();
            http.expectOne('/user').flush({ username: 'bob', id: 2 });
            expect(service.user().username).toBe('bob');
            expect(service.isLogged()).toBe(true);
        });

        it('does not update the signal when the response has no username', () => {
            service.fetchUser().subscribe();
            http.expectOne('/user').flush({});
            expect(service.isLogged()).toBe(false);
        });
    });

    // ---- exist() / isAuthenticated() / changePassword() ----------------------

    it('exist() sends GET /user/exist', () => {
        let result: boolean | undefined;
        service.exist().subscribe((r) => (result = r));
        http.expectOne({ method: 'GET', url: '/user/exist' }).flush(true);
        expect(result).toBe(true);
    });

    it('isAuthenticated() sends GET /user/isAuthenticated with responseType text', () => {
        service.isAuthenticated().subscribe();
        const req = http.expectOne({ method: 'GET', url: '/user/isAuthenticated' });
        expect(req.request.responseType).toBe('text');
        req.flush('ok');
    });

    it('changePassword() sends POST /user/changePassword with the payload', () => {
        const payload = { id: 1, password: 'old', newPassword: 'new', newPasswordConfirmation: 'new' };
        service.changePassword(payload).subscribe();
        const req = http.expectOne({ method: 'POST', url: '/user/changePassword' });
        expect(req.request.body).toEqual(payload);
        req.flush('ok');
    });
});
