import { Component, inject, input, output } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PageType } from '../../../models/models';
import { blankField, formatKey } from '../../../models/fields';
import { AddFieldComponent } from '../../post-types/add-field/add-field';
import { I18nService } from '../../../core/i18n/i18n.service';

let uidCounter = 0;

/**
 * Edits one page type in the settings: its title, the key pages store and the
 * fields pages of this type fill in.
 */
@Component({
    selector: 'app-page-type',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, AddFieldComponent],
    templateUrl: './page-type.html',
})
export class PageTypeComponent {
    protected readonly t = inject(I18nService).t;
    readonly pageType = input.required<PageType>();
    /** Titles of the pages of this type: such a type cannot be removed or get a new key. */
    readonly usedBy = input<string[]>([]);
    readonly remove = output<void>();

    protected readonly uid = `pt${uidCounter++}`;

    formatType(): void {
        const pageType = this.pageType();
        if (pageType.type) {
            pageType.type = formatKey(pageType.type);
        }
    }

    addField(): void {
        this.pageType().fields.push(blankField());
    }

    removeField(index: number): void {
        this.pageType().fields.splice(index, 1);
    }
}
