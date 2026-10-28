import { Component, ElementRef, afterRenderEffect, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../../core/user.service';
import { LanguageSwitchComponent } from '../../../layout/language-switch/language-switch';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
    selector: 'app-login',
    imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, LanguageSwitchComponent],
    templateUrl: './login.html',
})
export class LoginComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    protected readonly server = this.i18n.server;
    readonly exist = input<boolean>(false);

    private userService = inject(UserService);
    private router = inject(Router);

    protected data: { username?: string; password?: string } = {};
    protected readonly actionStatus = signal(false);
    protected readonly errorMessage = signal<string | undefined>(undefined);

    private readonly username = viewChild<ElementRef<HTMLInputElement>>('username');

    constructor() {
        // the field appears once the form renders (only when a user account exists);
        // the autofocus attribute would work only on the first page load, not after a log out
        afterRenderEffect(() => this.username()?.nativeElement.focus());
    }

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
                    this.router.navigate(['/']);
                },
                error: (error) => {
                    this.actionStatus.set(false);
                    this.errorMessage.set(error?.error?.error ?? error?.error ?? this.t('login.failed'));
                },
            });
    }
}
