import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

@Component({
    selector: 'app-error',
    templateUrl: './error.html',
})
export class ErrorComponent {
    protected readonly t = inject(I18nService).t;
}
