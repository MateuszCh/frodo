import {
    Component,
    computed,
    effect,
    forwardRef,
    inject,
    input,
    signal,
    untracked,
} from '@angular/core';
import { ControlContainer, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { Field, FieldType, PageComponent } from '../../../models/models';
import { FieldInputComponent } from '../field-input/field-input';
import { I18nService } from '../../../core/i18n/i18n.service';
import { CollapseStateService } from '../../../core/collapse-state.service';
import { onFailedSave } from '../../../shared/collapse.directive';

/** Field types whose value can name a collapsed row. */
const SUMMARY_TYPES: ReadonlySet<FieldType> = new Set([
    'text',
    'textarea',
    'number',
    'select',
    'component',
]);

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
})
export class RepeaterComponent {
    protected readonly t = inject(I18nService).t;
    readonly parentModel = input.required<Record<string, unknown>>();
    readonly field = input.required<Field>();
    readonly namePrefix = input<string>('');
    /**
     * Place of this field in its schema ("page-type:home/slides"), from app-field. Rows start
     * collapsed; with a place, rows left all open start open next time, on every page of the type.
     */
    readonly collapsePath = input<string>('');

    private readonly collapseState = inject(CollapseStateService);
    private restored = false;
    protected readonly rows = signal<Record<string, unknown>[]>([]);
    /** Indexes of the collapsed rows: view state only, the rows themselves stay as they are. */
    protected readonly collapsedRows = signal<ReadonlySet<number>>(new Set());
    protected readonly allCollapsed = computed(() =>
        this.rows().every((_, index) => this.collapsedRows().has(index)),
    );

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
            // only the first rows: a model swapped in after a save keeps the state as it is
            if (!this.restored) {
                this.restored = true;
                const key = untracked(() => this.collapseKey());
                if (!key || !this.collapseState.isExpanded(key)) {
                    this.collapsedRows.set(new Set(arr.map((_, index) => index)));
                }
            }
        });

        // a save that fails validation expands the rows that hold an invalid control
        onFailedSave((host) => {
            const rows = host.querySelectorAll(':scope > .repeater__rows > .repeater__row');
            const invalid = new Set<number>();
            rows.forEach((row, index) => {
                if (row.querySelector('.ng-invalid')) {
                    invalid.add(index);
                }
            });
            this.collapsedRows.set(
                new Set([...this.collapsedRows()].filter((i) => !invalid.has(i))),
            );
        });
    }

    private collapseKey(): string | null {
        return this.collapsePath() ? `rows:${this.collapsePath()}` : null;
    }

    private get array(): Record<string, unknown>[] {
        return this.parentModel()[this.field().id] as Record<string, unknown>[];
    }

    addRow(): void {
        this.array.push({});
        this.rows.set([...this.array]);
        // a new row opens, even where a removed one was collapsed before
        this.setCollapsed(this.array.length - 1, false);
    }

    removeRow(index: number): void {
        this.array.splice(index, 1);
        this.rows.set([...this.array]);
        // the rows below move up, and their state with them
        const collapsed = [...this.collapsedRows()]
            .filter((i) => i !== index)
            .map((i) => (i > index ? i - 1 : i));
        this.collapsedRows.set(new Set(collapsed));
    }

    toggleRow(index: number): void {
        this.setCollapsed(index, !this.collapsedRows().has(index));
        this.remember();
    }

    toggleAll(): void {
        this.collapsedRows.set(
            this.allCollapsed() ? new Set() : new Set(this.rows().map((_, index) => index)),
        );
        this.remember();
    }

    /** What a collapsed row shows beside its number: the first filled text-like value. */
    protected summary(row: Record<string, unknown>): string {
        for (const rf of this.field().repeaterFields ?? []) {
            if (!SUMMARY_TYPES.has(rf.type)) {
                continue;
            }
            const value =
                rf.type === 'component' ? (row[rf.id] as PageComponent | null)?.title : row[rf.id];
            if (value != null && String(value).trim()) {
                return String(value);
            }
        }
        return '';
    }

    /** After the user collapses or expands: remembered is whether all rows are open now. */
    private remember(): void {
        const key = this.collapseKey();
        if (key) {
            this.collapseState.set(
                key,
                this.rows().every((_, index) => !this.collapsedRows().has(index)),
            );
        }
    }

    private setCollapsed(index: number, collapsed: boolean): void {
        const next = new Set(this.collapsedRows());
        if (collapsed) {
            next.add(index);
        } else {
            next.delete(index);
        }
        this.collapsedRows.set(next);
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
