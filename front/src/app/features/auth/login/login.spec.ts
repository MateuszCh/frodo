import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NgForm } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { UserService } from '../../../core/user.service';
import { LoginComponent } from './login';

function fakeForm(valid: boolean): NgForm {
    return {
        valid,
        control: { markAllAsTouched: vi.fn() },
    } as unknown as NgForm;
}

describe('LoginComponent', () => {
    let fixture: ComponentFixture<LoginComponent>;
    let component: LoginComponent;
    let userServiceMock: { login: ReturnType<typeof vi.fn> };
    let router: Router;

    beforeEach(() => {
        userServiceMock = { login: vi.fn() };
        TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                provideRouter([]),
                provideLocationMocks(),
                provideNoopAnimations(),
                { provide: UserService, useValue: userServiceMock },
            ],
        });
        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
    });

    it('renders without error with exist = false', () => {
        fixture.componentRef.setInput('exist', false);
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('renders without error with exist = true', () => {
        fixture.componentRef.setInput('exist', true);
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('has errorMessage undefined initially', () => {
        expect((component as any).errorMessage()).toBeUndefined();
    });

    it('does not call userService.login when form is invalid', () => {
        component.login(fakeForm(false));
        expect(userServiceMock.login).not.toHaveBeenCalled();
    });

    it('marks all fields as touched when form is invalid', () => {
        const form = fakeForm(false);
        component.login(form);
        expect((form.control as any).markAllAsTouched).toHaveBeenCalled();
    });

    it('calls userService.login with the form data when form is valid', () => {
        userServiceMock.login.mockReturnValue(of({ username: 'alice', id: 1 }));
        (component as any).data = { username: 'alice', password: 'secret' };
        component.login(fakeForm(true));
        expect(userServiceMock.login).toHaveBeenCalledWith({ username: 'alice', password: 'secret' });
    });

    it('navigates to "/" on successful login', () => {
        userServiceMock.login.mockReturnValue(of({ username: 'alice', id: 1 }));
        const navigateSpy = vi.spyOn(router, 'navigate');
        component.login(fakeForm(true));
        expect(navigateSpy).toHaveBeenCalledWith(['/']);
    });

    it('sets actionStatus to false after successful login', () => {
        userServiceMock.login.mockReturnValue(of({ username: 'alice', id: 1 }));
        component.login(fakeForm(true));
        expect((component as any).actionStatus()).toBe(false);
    });

    it('sets errorMessage from error.error.error on login failure', () => {
        userServiceMock.login.mockReturnValue(
            throwError(() => ({ error: { error: 'Invalid credentials' } })),
        );
        component.login(fakeForm(true));
        expect((component as any).errorMessage()).toBe('Invalid credentials');
    });

    it('sets errorMessage from error.error (string) on login failure', () => {
        userServiceMock.login.mockReturnValue(
            throwError(() => ({ error: 'Bad request' })),
        );
        component.login(fakeForm(true));
        expect((component as any).errorMessage()).toBe('Bad request');
    });

    it('sets errorMessage to "Login failed" when no error detail is available', () => {
        userServiceMock.login.mockReturnValue(throwError(() => ({})));
        component.login(fakeForm(true));
        expect((component as any).errorMessage()).toBe('Login failed');
    });

    it('clears errorMessage at the start of each login attempt', () => {
        userServiceMock.login.mockReturnValue(
            throwError(() => ({ error: { error: 'Oops' } })),
        );
        component.login(fakeForm(true));
        expect((component as any).errorMessage()).toBe('Oops');

        userServiceMock.login.mockReturnValue(of({ username: 'alice', id: 1 }));
        component.login(fakeForm(true));
        expect((component as any).errorMessage()).toBeUndefined();
    });
});
