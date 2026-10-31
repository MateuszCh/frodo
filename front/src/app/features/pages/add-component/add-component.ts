import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ComponentEntity, PageComponent as PageComponentModel } from '../../../models/models';
import { FieldInputComponent } from '../../fields/field-input/field-input';
import { componentValue } from '../../../shared/component-value';
import { I18nService } from '../../../core/i18n/i18n.service';
import { CollapseDirective } from '../../../shared/collapse.directive';

/**
 * Port of add-component.component.js — picks a component type for a page row and
 * renders that component's fields, bound to row.data. The page editor collapses the
 * components one by one or all at once (`collapse`).
 */
@Component({
    selector: 'app-add-component',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    hostDirectives: [
        {
            directive: CollapseDirective,
            inputs: ['appCollapseOpen: collapseOpen'],
            outputs: ['appCollapseChange: collapseChange'],
        },
    ],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        FieldInputComponent,
    ],
    templateUrl: './add-component.html',
})
export class AddComponentComponent implements OnInit {
    protected readonly t = inject(I18nService).t;
    readonly components = input.required<ComponentEntity[]>();
    readonly model = input.required<PageComponentModel>();
    readonly order = input<number>(0);
    readonly remove = output<void>();

    readonly collapse = inject(CollapseDirective, { self: true });

    protected readonly current = signal<ComponentEntity | undefined>(undefined);
    /** A known component chosen: there are fields to collapse. */
    readonly hasFields = computed(() => !!this.current());

    ngOnInit(): void {
        const type = this.model().type;
        if (type) {
            this.current.set(this.components().find((c) => c.type === type));
        }
    }

    compare = (a: ComponentEntity, b: ComponentEntity): boolean => a?.type === b?.type;

    onSelect(component: ComponentEntity): void {
        this.current.set(component);
        // a chosen component shows its fields, also in a list collapsed as a whole
        this.collapse.collapsed.set(false);
        // the row stays the same object: it sits in page.rows
        Object.assign(this.model(), componentValue(component));
    }
}
