import {
    Component,
    DestroyRef,
    ElementRef,
    Injector,
    afterNextRender,
    computed,
    effect,
    inject,
    input,
    signal,
    untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { Field, Post, PostFieldValue } from '../../../models/models';
import { PostTypesService } from '../../../core/post-types.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { EDITED_POST } from '../../../shared/edited-post';
import { PostPickerDialogComponent, PostPickerDialogData } from '../post-picker-dialog/post-picker-dialog';

/** A chosen post as listed under the field; `post` is missing when it is not available. */
interface ChosenPost {
    id: number;
    post?: Post;
}

let uidCounter = 0;

/**
 * The value a "post" field keeps: { ids } with whole-number ids, each once, or null. A stored
 * value of another shape is not kept; the same object comes back when it is already right.
 */
export function normalizePostFieldValue(value: unknown): PostFieldValue | null {
    const ids = (value as PostFieldValue | null)?.ids;
    if (!Array.isArray(ids)) {
        return null;
    }
    const valid = [...new Set(ids.filter((id) => Number.isInteger(id)))];
    if (!valid.length) {
        return null;
    }
    return valid.length === ids.length ? (value as PostFieldValue) : { ids: valid };
}

/**
 * A "post" field: picks posts of the post type set in the field (`field.postType`) in a
 * dialog. The value under `parentModel[field.id]` is { ids } (the numeric post ids, in the
 * chosen order), and null when nothing is chosen.
 */
@Component({
    selector: 'app-post-field',
    imports: [MatButtonModule],
    templateUrl: './post-field.html',
})
export class PostFieldComponent {
    protected readonly t = inject(I18nService).t;
    readonly parentModel = input.required<Record<string, unknown>>();
    readonly field = input.required<Field>();

    private readonly postTypesService = inject(PostTypesService);
    private readonly dialog = inject(MatDialog);
    private readonly host: HTMLElement = inject(ElementRef).nativeElement;
    private readonly injector = inject(Injector);
    /** the post being edited, when the field is in the post editor */
    private readonly editedPost = inject(EDITED_POST, { optional: true });

    protected readonly uid = `post-field-${uidCounter++}`;
    protected readonly value = signal<PostFieldValue | null>(null);
    protected readonly postType = computed(() => this.field().postType || null);
    /** Posts of the post type (id, title and type); null while they load or after an error. */
    protected readonly posts = signal<Post[] | null>(null);
    /** plural title of the post type, for the dialog */
    private readonly postTypeTitle = signal('');
    protected readonly loadError = signal(false);
    protected readonly chosen = computed<ChosenPost[]>(() => {
        const posts = this.posts() ?? [];
        return (this.value()?.ids ?? []).map((id) => ({ id, post: posts.find((post) => post.id === id) }));
    });

    private loading?: Subscription;

    constructor() {
        // Re-sync whenever the bound model object is replaced (the editors swap in
        // the server response after a save), as ComponentFieldComponent does.
        effect(() => {
            const model = this.parentModel();
            const id = this.field().id;
            const stored = model[id];
            const value = normalizePostFieldValue(stored);
            // a value of another shape, or with repeated ids, is not saved back as it was
            if (stored != null && value !== stored) {
                model[id] = value;
            }
            this.value.set(value);
        });

        effect(() => {
            const type = this.postType();
            untracked(() => this.load(type));
        });

        inject(DestroyRef).onDestroy(() => this.loading?.unsubscribe());
    }

    /** Title of a chosen post; "#id" until the posts are there. */
    protected label(item: ChosenPost): string {
        if (!this.posts()) {
            return `#${item.id}`;
        }
        if (!item.post) {
            return this.t('postField.missing', { id: item.id });
        }
        return item.post.title || this.t('common.untitled');
    }

    reload(): void {
        this.load(this.postType());
    }

    choosePosts(): void {
        const posts = this.posts();
        if (!posts) {
            return;
        }
        const editedId = this.editedPost?.postId();
        this.dialog
            .open<PostPickerDialogComponent, PostPickerDialogData, number[]>(PostPickerDialogComponent, {
                data: {
                    title: this.postTypeTitle() || this.field().title,
                    // a post does not point to itself
                    posts: posts.filter((post) => post.id !== editedId),
                    selected: this.value()?.ids ?? [],
                },
                width: '560px',
                maxWidth: '95vw',
            })
            .afterClosed()
            .subscribe((ids) => {
                // into the model bound now: a save may have swapped it while the dialog was open
                if (ids) {
                    this.write(ids);
                }
            });
    }

    removePost(index: number): void {
        this.write((this.value()?.ids ?? []).filter((_, i) => i !== index));
        // the button clicked is gone: focus the one now in its place, the one above, or Choose posts
        this.focusAfterRender((host) => {
            const buttons = host.querySelectorAll<HTMLButtonElement>('.post-field__item button');
            return buttons[Math.min(index, buttons.length - 1)];
        });
    }

    clear(): void {
        this.write([]);
        this.focusAfterRender(() => undefined);
    }

    /** No chosen posts are stored as null, as the other fields store an empty value. */
    private write(ids: number[]): void {
        const value = ids.length ? { ids } : null;
        this.parentModel()[this.field().id] = value;
        this.value.set(value);
    }

    /** Focuses the element `find` returns once the list has rendered, or Choose posts. */
    private focusAfterRender(find: (host: HTMLElement) => HTMLElement | undefined): void {
        afterNextRender(
            () => (find(this.host) ?? this.host.querySelector<HTMLElement>('.post-field__choose'))?.focus(),
            { injector: this.injector },
        );
    }

    private load(type: string | null): void {
        this.loading?.unsubscribe();
        this.posts.set(null);
        this.loadError.set(false);
        if (!type) {
            return;
        }
        this.loading = this.postTypesService.getPostTitles(type).subscribe({
            next: (postType) => {
                this.postTypeTitle.set(postType.pluralTitle || postType.title);
                this.posts.set(postType.posts ?? []);
            },
            error: (error: unknown) => {
                if (error instanceof HttpErrorResponse && error.status === 404) {
                    // the post type is gone, and its posts with it
                    this.postTypeTitle.set(type);
                    this.posts.set([]);
                } else {
                    // the posts may well be there: nothing is shown as unavailable
                    this.loadError.set(true);
                }
            },
        });
    }
}
