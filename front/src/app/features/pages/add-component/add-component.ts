import { Component, OnInit, input, output, signal } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ComponentEntity, PageComponent as PageComponentModel } from '../../../models/models';
import { FieldInputComponent } from '../../fields/field-input/field-input';

/**
 * Port of add-component.component.js — picks a component type for a page row and
 * renders that component's fields, bound to row.data.
 */
@Component({
    selector: 'app-add-component',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        FieldInputComponent,
    ],
    templateUrl: './add-component.html',
    styleUrl: './add-component.scss',
})
export class AddComponentComponent implements OnInit {
    readonly components = input.required<ComponentEntity[]>();
    readonly model = input.required<PageComponentModel>();
    readonly order = input<number>(0);
    readonly remove = output<void>();

    protected readonly current = signal<ComponentEntity | undefined>(undefined);
    protected readonly open = signal(false);

    ngOnInit(): void {
        const type = this.model().type;
        if (type) {
            this.current.set(this.components().find((c) => c.type === type));
            this.open.set(true);
        }
    }

    compare = (a: ComponentEntity, b: ComponentEntity): boolean => a?.type === b?.type;

    onSelect(component: ComponentEntity): void {
        this.current.set(component);
        this.open.set(true);
        const row = this.model();
        row.data = {};
        row.title = component.title;
        row.type = component.type;
    }
}
