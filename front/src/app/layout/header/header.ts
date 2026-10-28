import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { LayoutService } from '../../core/layout.service';
import { I18nService } from '../../core/i18n/i18n.service';

/** Port of header.component.js — mobile top bar with sidenav toggle. */
@Component({
    selector: 'app-header',
    imports: [RouterLink, MatButtonModule],
    templateUrl: './header.html',
})
export class HeaderComponent {
    protected readonly t = inject(I18nService).t;
    protected layout = inject(LayoutService);
}
