import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ListingRow } from '../../../core/listing.service';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface ExportDialogData {
    /** title of the listing, for the dialog title */
    title: string;
    /** every item of the listing, in its order */
    items: ListingRow[];
}

/**
 * Picks the items of a listing to export, all of them checked at the start. Looks like the
 * post field's picker (the same classes); Select all / Deselect all act on the items the
 * search shows. Closes with the `_id`s chosen, in the listing's order, or with nothing on Cancel.
 */
@Component({
    selector: 'app-export-dialog',
    imports: [MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatDialogModule],
    templateUrl: './export-dialog.html',
})
export class ExportDialogComponent {
    protected readonly t = inject(I18nService).t;
    readonly data = inject<ExportDialogData>(MAT_DIALOG_DATA);
    private ref = inject(MatDialogRef<ExportDialogComponent, string[]>);

    protected readonly items = this.data.items;
    protected readonly query = signal('');
    protected readonly filtered = computed(() => {
        const query = this.query().trim().toLowerCase();
        return query ? this.items.filter((item) => (item.title ?? '').toLowerCase().includes(query)) : this.items;
    });
    protected readonly selected = signal(new Set(this.items.map((item) => item._id)));
    protected readonly count = computed(() => this.selected().size);
    /** every item the search shows is checked: the button unchecks them */
    protected readonly allShownSelected = computed(() => {
        const selected = this.selected();
        return this.filtered().length > 0 && this.filtered().every((item) => selected.has(item._id));
    });

    isSelected(id: string): boolean {
        return this.selected().has(id);
    }

    /** Escape clears a search first; with none, it closes the dialog as usual. */
    clearSearch(event: Event): void {
        if (this.query()) {
            event.stopPropagation();
            this.query.set('');
        }
    }

    toggle(id: string, checked: boolean): void {
        this.selected.update((ids) => {
            const next = new Set(ids);
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }

    /** Checks the items the search shows, or unchecks them when all of them are checked. */
    toggleAll(): void {
        const check = !this.allShownSelected();
        const shown = this.filtered().map((item) => item._id);
        this.selected.update((ids) => {
            const next = new Set(ids);
            shown.forEach((id) => (check ? next.add(id) : next.delete(id)));
            return next;
        });
    }

    confirm(): void {
        const selected = this.selected();
        if (selected.size) {
            this.ref.close(this.items.filter((item) => selected.has(item._id)).map((item) => item._id));
        }
    }
}
