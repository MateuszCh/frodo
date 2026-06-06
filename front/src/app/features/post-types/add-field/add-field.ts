import { Component, forwardRef, input, output } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Field } from '../../../models/models';
import { FIELD_LIST } from '../../../models/fields';

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
    styleUrl: './add-field.scss',
})
export class AddFieldComponent {
    readonly field = input.required<Field>();
    readonly remove = output<void>();

    protected readonly uid = `f${uidCounter++}`;
    protected readonly fieldTypes = FIELD_LIST;

    formatId(): void {
        const f = this.field();
        if (f.id) {
            f.id = f.id.replace(/\s+/g, '_').toLowerCase();
        }
    }

    addRepeaterField(): void {
        const f = this.field();
        if (!f.repeaterFields) {
            f.repeaterFields = [];
        }
        f.repeaterFields.push(this.blankField());
    }

    removeRepeaterField(index: number): void {
        this.field().repeaterFields?.splice(index, 1);
    }

    private blankField(): Field {
        return {
            type: 'text',
            title: '',
            id: '',
            selectOptions: undefined,
            multiselectOptions: undefined,
            repeaterFields: [],
        };
    }
}
