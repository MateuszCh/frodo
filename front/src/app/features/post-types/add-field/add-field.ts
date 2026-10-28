import { Component, forwardRef, inject, input, output } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Field } from '../../../models/models';
import { FIELD_LIST, blankField, formatKey } from '../../../models/fields';
import { I18nService } from '../../../core/i18n/i18n.service';

let uidCounter = 0;

/**
 * Port of add-field.component.js — edits one field schema (title/id/type +
 * select/multiselect options) and recursively edits repeater sub-fields.
 */
@Component({
    selector: 'app-add-field',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        forwardRef(() => AddFieldComponent),
    ],
    templateUrl: './add-field.html',
})
export class AddFieldComponent {
    private readonly i18n = inject(I18nService);
    protected readonly t = this.i18n.t;
    protected readonly fieldType = this.i18n.fieldType;
    readonly field = input.required<Field>();
    readonly remove = output<void>();

    protected readonly uid = `f${uidCounter++}`;
    protected readonly fieldTypes = FIELD_LIST;

    formatId(): void {
        const f = this.field();
        if (f.id) {
            f.id = formatKey(f.id);
        }
    }

    addRepeaterField(): void {
        const f = this.field();
        if (!f.repeaterFields) {
            f.repeaterFields = [];
        }
        f.repeaterFields.push(blankField());
    }

    removeRepeaterField(index: number): void {
        this.field().repeaterFields?.splice(index, 1);
    }
}
