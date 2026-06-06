import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LayoutService } from '../../core/layout.service';

/** Port of header.component.js — mobile top bar with sidenav toggle. */
@Component({
    selector: 'app-header',
    imports: [RouterLink, MatButtonModule, MatIconModule],
    templateUrl: './header.html',
    styleUrl: './header.scss',
})
export class HeaderComponent {
    protected layout = inject(LayoutService);
}
