import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { Post, PostType } from '../../models/models';
import { PostsService } from '../../core/posts.service';
import { ToolsService } from '../../core/tools.service';
import { FieldInputComponent } from '../fields/field-input/field-input';

@Component({
    selector: 'app-post',
    imports: [
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        FieldInputComponent,
    ],
    templateUrl: './post.html',
    styleUrl: './post.scss',
})
export class PostComponent implements OnInit {
    readonly type = input<string>('');
    readonly postType = input.required<PostType>();
    readonly post = input<Post>();

    private router = inject(Router);
    private postsService = inject(PostsService);
    private tools = inject(ToolsService);

    protected readonly model = signal<Post>({ title: '', type: '', data: {} });
    protected readonly actionStatus = signal<'' | 'save' | 'remove'>('');
    protected readonly edit = computed(() => !!this.post());
    protected readonly fields = computed(() => this.postType().fields);

    ngOnInit(): void {
        const postType = this.postType();
        const existing = this.post();
        if (existing) {
            if (!existing.data) {
                existing.data = {};
            }
            this.checkModel(existing, postType);
            this.model.set(existing);
        } else {
            this.model.set({ title: '', type: postType.type, data: {} });
        }
    }

    save(form: NgForm): void {
        if (!form.valid) {
            form.control.markAllAsTouched();
            this.tools.scrollToError();
            return;
        }
        this.actionStatus.set('save');
        const editing = this.edit();
        const request = editing
            ? this.postsService.edit(this.model())
            : this.postsService.create(this.model());

        request.subscribe({
            next: (response) => {
                if (editing) {
                    this.actionStatus.set('');
                    this.model.set(response);
                    this.tools.alert(`${response.title} updated successfully`);
                } else if (response.url) {
                    this.router.navigateByUrl(response.url);
                } else {
                    this.router.navigate(['/posts', this.postType().type]);
                }
            },
            error: (err) => {
                this.actionStatus.set('');
                this.tools.alert(err?.error?.error ?? err?.error ?? 'Error saving');
            },
        });
    }

    removeDialog(): void {
        const label = this.model().title || `${this.postType().type} post`;
        this.tools.confirm(`Are you sure you want to delete ${label}?`).subscribe((ok) => {
            if (ok) {
                this.remove();
            }
        });
    }

    private remove(): void {
        this.actionStatus.set('remove');
        this.postsService.remove(this.model()._id!).subscribe({
            next: () => this.router.navigate(['/posts', this.postType().type]),
            error: () => {
                this.actionStatus.set('');
                const label = this.model().title || `${this.postType().type} post`;
                this.tools.alert(`There was an error removing ${label}`);
            },
        });
    }

    /** Drop data keys not present in the post type schema (legacy checkModel). */
    private checkModel(post: Post, postType: PostType): void {
        const validIds = postType.fields.map((f) => f.id);
        Object.keys(post.data ?? {}).forEach((key) => {
            if (validIds.indexOf(key) < 0) {
                delete post.data[key];
            }
        });
    }
}
