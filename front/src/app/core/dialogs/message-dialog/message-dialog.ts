import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { I18nService } from '../../i18n/i18n.service';

export interface MessageDialogData {
    /** when true the dialog shows Yes/No (confirm), otherwise just Ok (alert). */
    confirm?: boolean;
    message: string;
    title?: string;
}

/** Replaces $mdDialog.alert()/confirm() from tools.service.js. */
@Component({
    selector: 'app-message-dialog',
    imports: [MatButtonModule, MatDialogModule],
    templateUrl: './message-dialog.html',
})
export class MessageDialogComponent {
    protected readonly t = inject(I18nService).t;
    readonly data = inject<MessageDialogData>(MAT_DIALOG_DATA);
}
