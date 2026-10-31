import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Post } from '../../../models/models';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface PostPickerDialogData {
    /** plural title of the post type, for the dialog title */
    title: string;
    posts: Post[];
    /** ids chosen so far */
    selected: number[];
}

/**
 * Picks posts of one post type for a "post" field. Closes with the chosen ids, in the
 * order they were chosen (kept for the ones chosen before), or with nothing on Cancel.
 */
@Component({
    selector: 'app-post-picker-dialog',
    imports: [MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatDialogModule],
    templateUrl: './post-picker-dialog.html',
})
export class PostPickerDialogComponent {
    protected readonly t = inject(I18nService).t;
    readonly data = inject<PostPickerDialogData>(MAT_DIALOG_DATA);
    private ref = inject(MatDialogRef<PostPickerDialogComponent, number[]>);

    /** posts without a numeric id cannot be stored in the field */
    protected readonly posts = this.data.posts.filter((post) => typeof post.id === 'number');
    protected readonly query = signal('');
    protected readonly filtered = computed(() => {
        const query = this.query().trim().toLowerCase();
        return query ? this.posts.filter((post) => (post.title ?? '').toLowerCase().includes(query)) : this.posts;
    });
    protected readonly selected = signal<number[]>([...this.data.selected]);
    /** Chosen posts on the list; ids of unavailable posts stay chosen but are not counted. */
    protected readonly count = computed(() => {
        const listed = new Set(this.posts.map((post) => post.id));
        return this.selected().filter((id) => listed.has(id)).length;
    });

    isSelected(id: number): boolean {
        return this.selected().includes(id);
    }

    /** Escape clears a search first; with none, it closes the dialog as usual. */
    clearSearch(event: Event): void {
        if (this.query()) {
            event.stopPropagation();
            this.query.set('');
        }
    }

    toggle(id: number, checked: boolean): void {
        this.selected.update((ids) => (checked ? [...ids.filter((i) => i !== id), id] : ids.filter((i) => i !== id)));
    }

    confirm(): void {
        // ids chosen before whose posts are gone stay chosen until removed in the field
        this.ref.close(this.selected());
    }
}
