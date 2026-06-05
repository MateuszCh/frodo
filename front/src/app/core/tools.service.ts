import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { MessageDialogComponent, MessageDialogData } from './dialogs/message-dialog/message-dialog';

/** Port of tools.service.js — dialogs (MatDialog) + scroll/util helpers. */
@Injectable({ providedIn: 'root' })
export class ToolsService {
    private dialog = inject(MatDialog);

    /** Alert dialog (old infoDialog). */
    alert(message: string, title?: string): void {
        this.dialog.open<MessageDialogComponent, MessageDialogData>(MessageDialogComponent, {
            data: { message, title, confirm: false },
        });
    }

    /** Confirm dialog (old removeDialog) — emits true when confirmed. */
    confirm(message: string, title?: string): Observable<boolean> {
        return this.dialog
            .open<MessageDialogComponent, MessageDialogData, boolean>(MessageDialogComponent, {
                data: { message, title, confirm: true },
            })
            .afterClosed() as Observable<boolean>;
    }

    /** Scroll the first invalid form control into view (old scrollToError). */
    scrollToError(container = '#scroll'): void {
        setTimeout(() => {
            const root = document.querySelector(container) ?? document;
            const invalid = root.querySelector(
                '.ng-invalid[formcontrolname], .mat-mdc-form-field.ng-invalid, .ng-invalid',
            );
            invalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    debounce<T extends (...args: never[]) => void>(fn: T, wait: number): T {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        return ((...args: Parameters<T>) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), wait);
        }) as T;
    }
}
