import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../../core/user.service';
import { FilesService } from '../../../core/files.service';

@Component({
    selector: 'app-login',
    imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class LoginComponent {
    readonly exist = input<boolean>(false);

    private userService = inject(UserService);
    private filesService = inject(FilesService);
    private router = inject(Router);

    protected data: { username?: string; password?: string } = {};
    protected readonly actionStatus = signal(false);
    protected readonly errorMessage = signal<string | undefined>(undefined);

    login(form: NgForm): void {
        this.errorMessage.set(undefined);
        if (!form.valid) {
            form.control.markAllAsTouched();
            return;
        }
        this.actionStatus.set(true);
        this.userService
            .login({ username: this.data.username!, password: this.data.password! })
            .subscribe({
                next: () => {
                    this.actionStatus.set(false);
                    // the app-initializer preload ran before authentication and
                    // got a 401 — reload catalogues now that the session exists
                    this.filesService
                        .loadCatalogues()
                        .pipe(catchError(() => of([])))
                        .subscribe();
                    this.router.navigate(['/']);
                },
                error: (error) => {
                    this.actionStatus.set(false);
                    this.errorMessage.set(error?.error?.error ?? error?.error ?? 'Login failed');
                },
            });
    }
}
