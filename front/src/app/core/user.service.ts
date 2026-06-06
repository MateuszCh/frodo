import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../models/models';

export interface LoginPayload {
    username: string;
    password: string;
}

export interface ChangePasswordPayload {
    id: number | string;
    password: string;
    newPassword: string;
    newPasswordConfirmation: string;
}

/** Port of user.service.js — holds the current session user in a signal. */
@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);

    private _user = signal<User>({ username: undefined, id: undefined, logged: 0 });
    readonly user = this._user.asReadonly();
    readonly isLogged = computed(() => !!this._user().logged);

    setUser(username?: string, id?: number | string, logged = 0): void {
        this._user.set({ username, id, logged, loaded: Date.now() });
    }

    clear(): void {
        this._user.set({ username: undefined, id: undefined, logged: 0 });
    }

    login(data: LoginPayload): Observable<User> {
        return this.http
            .post<User>('/user/login', data)
            .pipe(tap((res) => this.setUser(res.username, res.id, 1)));
    }

    logout(): Observable<string> {
        return this.http
            .get('/user/logout', { responseType: 'text' })
            .pipe(tap(() => this.clear()));
    }

    exist(): Observable<boolean> {
        return this.http.get<boolean>('/user/exist');
    }

    isAuthenticated(): Observable<string> {
        return this.http.get('/user/isAuthenticated', { responseType: 'text' });
    }

    fetchUser(): Observable<User> {
        return this.http.get<User>('/user').pipe(
            tap((res) => {
                if (res?.username) {
                    this.setUser(res.username, res.id, 1);
                }
            }),
        );
    }

    changePassword(data: ChangePasswordPayload): Observable<string> {
        return this.http.post('/user/changePassword', data, { responseType: 'text' });
    }
}
