import { Component, effect, forwardRef, input, signal } from '@angular/core';
import { ControlContainer, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Field } from '../../../models/models';
import { FieldInputComponent } from '../field-input/field-input';

/**
 * Port of repeater.componenet.js — repeatable group of fields stored as an
 * array of row objects under `parentModel[field.id]`.
 */
@Component({
    selector: 'app-repeater',
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    imports: [
        MatButtonModule,
        // AOT resolves the circular import statically; the arrow only runs
        // when TestBed recompiles the component
        /* v8 ignore next */
        forwardRef(() => FieldInputComponent),
    ],
    templateUrl: './repeater.html',
    styleUrl: './repeater.scss',
})
export class RepeaterComponent {
    readonly parentModel = input.required<Record<string, unknown>>();
    readonly field = input.required<Field>();
    readonly namePrefix = input<string>('');

    protected readonly rows = signal<Record<string, unknown>[]>([]);

    constructor() {
        // Re-sync whenever the bound model object is replaced (the post editor
        // swaps in the server response after a save) — a one-time ngOnInit
        // snapshot would keep the rendered rows bound to the detached old
        // object, silently losing any edits made after the save.
        effect(() => {
            const parent = this.parentModel();
            const id = this.field().id;
            if (!Array.isArray(parent[id])) {
                parent[id] = [];
            }
            const arr = parent[id] as Record<string, unknown>[];
            this.checkModel(arr);
            this.rows.set([...arr]);
        });
    }

    private get array(): Record<string, unknown>[] {
        return this.parentModel()[this.field().id] as Record<string, unknown>[];
    }

    addRow(): void {
        this.array.push({});
        this.rows.set([...this.array]);
    }

    removeRow(index: number): void {
        this.array.splice(index, 1);
        this.rows.set([...this.array]);
    }

    /** Drop stale keys not present in the repeater schema (legacy checkModel). */
    private checkModel(rows: Record<string, unknown>[]): void {
        const validIds = (this.field().repeaterFields ?? []).map((f) => f.id);
        rows.forEach((row) => {
            Object.keys(row).forEach((key) => {
                if (validIds.indexOf(key) < 0) {
                    delete row[key];
                }
            });
        });
    }
}
