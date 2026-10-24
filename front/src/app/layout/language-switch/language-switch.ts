import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

/** Polish / English switch: two radio options styled like the theme switch. */
@Component({
    selector: 'app-language-switch',
    templateUrl: './language-switch.html',
})
export class LanguageSwitchComponent {
    protected i18n = inject(I18nService);
}
