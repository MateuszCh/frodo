import { Component, forwardRef, inject, input, output } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Field } from '../../../models/models';
import { FIELD_LIST, blankField, formatKey } from '../../../models/fields';
import { I18nService } from '../../../core/i18n/i18n.service';
import { PostTypesService } from '../../../core/post-types.service';
import { CollapseDirective } from '../../../shared/collapse.directive';

let uidCounter = 0;

/**
 * Port of add-field.component.js — edits one field schema (title/id/type +
 * select/multiselect options, the post type of a "post" field) and recursively edits
 * repeater sub-fields.
 * The card starts collapsed to its head; the parent passes the key it is remembered under
 * and opens a new field (no id yet).
 */
@Component({
    selector: 'app-add-field',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    hostDirectives: [
        {
            directive: CollapseDirective,
            inputs: ['appCollapse: collapseKey', 'appCollapseOpen: collapseOpen'],
        },
    ],
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
    readonly collapse = inject(CollapseDirective, { self: true });

    protected readonly uid = `f${uidCounter++}`;
    protected readonly fieldTypes = FIELD_LIST;

    private readonly postTypesService = inject(PostTypesService);

    /**
     * The post types, and the key the field keeps when no post type has it any more. A
     * method: the field is a plain object, edited in place.
     */
    protected postTypeOptions(): { type: string; title: string }[] {
        const options = this.postTypesService
            .menu()
            .map((postType) => ({ type: postType.type, title: postType.pluralTitle || postType.title }));
        const type = this.field().postType;
        return type && !options.some((option) => option.type === type)
            ? [...options, { type, title: this.t('postField.unknown', { type }) }]
            : options;
    }

    /** No post type exists yet: a "post" field has nothing to pick from. */
    protected noPostTypes(): boolean {
        return this.postTypesService.menuLoaded() && !this.postTypesService.menu().length;
    }

    /** A field that stops being a "post" field keeps no post type. */
    setType(type: Field['type']): void {
        const f = this.field();
        f.type = type;
        if (type !== 'post') {
            delete f.postType;
        }
    }

    /** The sidenav loads the post types; a select opened before it answers asks itself. */
    loadPostTypes(open: boolean): void {
        if (open && !this.postTypesService.menu().length) {
            this.postTypesService.refreshMenu();
        }
    }

    /** A row field is remembered under this card's key and its own id. */
    protected childKey(field: Field): string | null {
        const key = this.collapse.key();
        return key && field.id ? `${key}/${field.id}` : null;
    }

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
