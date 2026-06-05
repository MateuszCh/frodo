import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UserService } from '../../../core/user.service';
import { ToolsService } from '../../../core/tools.service';
import { User } from '../../../models/models';

@Component({
    selector: 'app-account',
    imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
    templateUrl: './account.html',
    styleUrl: './account.scss',
})
export class AccountComponent implements OnInit {
    readonly user = input<User>();

    private userService = inject(UserService);
    private tools = inject(ToolsService);

    protected data: {
        id?: number | string;
        password?: string;
        newPassword?: string;
        newPasswordConfirmation?: string;
    } = {};
    protected readonly passwordStatus = signal(false);
    protected readonly errorMessage = signal<string | undefined>(undefined);
    protected readonly successMessage = signal<string | undefined>(undefined);

    ngOnInit(): void {
        this.data.id = this.user()?.id;
    }

    changePassword(form: NgForm): void {
        if (!form.valid) {
            form.control.markAllAsTouched();
            this.tools.scrollToError();
            return;
        }
        this.passwordStatus.set(true);
        this.errorMessage.set(undefined);
        this.successMessage.set(undefined);
        this.userService
            .changePassword({
                id: this.data.id!,
                password: this.data.password!,
                newPassword: this.data.newPassword!,
                newPasswordConfirmation: this.data.newPasswordConfirmation!,
            })
            .subscribe({
                next: () => {
                    this.passwordStatus.set(false);
                    this.successMessage.set('Password changed successfully');
                },
                error: (err) => {
                    this.passwordStatus.set(false);
                    this.errorMessage.set(
                        err?.error?.error ?? err?.error ?? 'Error changing password',
                    );
                },
            });
    }
}
