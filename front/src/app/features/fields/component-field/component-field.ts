import { Component, computed, effect, forwardRef, inject, input, signal } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ComponentEntity, Field, PageComponent } from '../../../models/models';
import { ComponentsService } from '../../../core/components.service';
import { FieldInputComponent } from '../field-input/field-input';
import { componentValue } from '../../../shared/component-value';
import { I18nService } from '../../../core/i18n/i18n.service';

/**
 * A "component" field: picks one of the components and renders its fields. The value
 * under `parentModel[field.id]` has the shape of a page row, { type, title, data },
 * and is null when nothing is chosen. A repeater of these is a list of components.
 */
@Component({
    selector: 'app-component-field',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        // AOT resolves the circular import statically; the arrow only runs
        // when TestBed recompiles the component
        /* v8 ignore next */
        forwardRef(() => FieldInputComponent),
    ],
    templateUrl: './component-field.html',
})
export class ComponentFieldComponent {
    protected readonly t = inject(I18nService).t;
    readonly parentModel = input.required<Record<string, unknown>>();
    readonly field = input.required<Field>();
    /** control name of this field (app-field passes prefix + id, as to the repeater). */
    readonly namePrefix = input<string>('');

    private readonly componentsService = inject(ComponentsService);
    protected readonly components = this.componentsService.list;
    protected readonly value = signal<PageComponent | null>(null);
    protected readonly current = computed(() => this.find(this.value()?.type));
    /** A type that is no longer on the list (the component was removed): an option of its own. */
    protected readonly unknownType = computed(() => {
        const type = this.value()?.type;
        return type && this.componentsService.loaded() && !this.current() ? type : null;
    });

    constructor() {
        // any editor can hold this field (posts, page types, nested components), not only
        // the page editor, whose resolver loads the components anyway
        this.componentsService.loadList();

        // Re-sync whenever the bound model object is replaced (the editors swap in
        // the server response after a save), as RepeaterComponent does.
        effect(() => {
            const value = (this.parentModel()[this.field().id] as PageComponent | null | undefined) ?? null;
            if (value) {
                if (!value.data) {
                    value.data = {};
                }
                this.checkModel(value);
            }
            this.value.set(value);
        });
    }

    select(type: string): void {
        const component = this.find(type);
        if (!component) {
            return;
        }
        const value = componentValue(component);
        this.parentModel()[this.field().id] = value;
        this.value.set(value);
    }

    clear(): void {
        this.parentModel()[this.field().id] = null;
        this.value.set(null);
    }

    private find(type: string | undefined): ComponentEntity | undefined {
        return type ? this.components().find((component) => component.type === type) : undefined;
    }

    /** Drop stale keys not present in the component's fields (as the repeater's checkModel). */
    private checkModel(value: PageComponent): void {
        const component = this.find(value.type);
        if (!component) {
            return;
        }
        const validIds = component.fields.map((f) => f.id);
        Object.keys(value.data!).forEach((key) => {
            if (validIds.indexOf(key) < 0) {
                delete value.data![key];
            }
        });
    }
}
