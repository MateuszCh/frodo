import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CollapseDirective } from '../collapse.directive';
import { I18nService } from '../../core/i18n/i18n.service';

/** Chevron in the header of a section card that collapses with appCollapse. */
@Component({
    selector: 'app-collapse-toggle',
    imports: [MatButtonModule],
    templateUrl: './collapse-toggle.html',
    host: { class: 'card__toggle' },
})
export class CollapseToggleComponent {
    protected readonly t = inject(I18nService).t;
    /** The card's appCollapse. */
    readonly target = input.required<CollapseDirective>();
    /** Title of the section, for the label. */
    readonly name = input.required<string>();
}
