import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ComponentEntity, Page, PageComponent as PageRowModel } from '../../../models/models';
import { PagesService } from '../../../core/pages.service';
import { ToolsService } from '../../../core/tools.service';
import { AddComponentComponent } from '../add-component/add-component';

@Component({
    selector: 'app-page',
    imports: [
        FormsModule,
        DragDropModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        AddComponentComponent,
    ],
    templateUrl: './page.html',
    styleUrl: './page.scss',
})
export class PageComponent implements OnInit {
    readonly components = input<ComponentEntity[]>([]);
    readonly page = input<Page>();

    private router = inject(Router);
    private pagesService = inject(PagesService);
    private tools = inject(ToolsService);

    protected readonly model = signal<Page>({ title: '', pageUrl: '', rows: [] });
    protected readonly currentTitle = signal('');
    protected readonly actionStatus = signal<'' | 'save' | 'remove'>('');
    protected readonly edit = computed(() => !!this.page());
    // rows as a typed view for the template
    protected readonly rows = computed(() => this.model().rows as unknown as PageRowModel[]);

    ngOnInit(): void {
        const existing = this.page();
        if (existing) {
            if (!existing.rows) {
                existing.rows = [];
            }
            this.model.set(existing);
            this.currentTitle.set(existing.title);
        } else {
            this.model.set({ title: '', pageUrl: '', rows: [] });
        }
    }

    addComponent(): void {
        (this.model().rows as unknown as PageRowModel[]).push({ data: {}, title: '', type: '' });
        this.model.set({ ...this.model() });
    }

    removeComponent(index: number): void {
        this.model().rows.splice(index, 1);
        this.model.set({ ...this.model() });
    }

    drop(event: CdkDragDrop<unknown>): void {
        moveItemInArray(this.model().rows, event.previousIndex, event.currentIndex);
        this.model.set({ ...this.model() });
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
            ? this.pagesService.edit(this.model())
            : this.pagesService.create(this.model());

        request.subscribe({
            next: (response) => {
                if (editing) {
                    this.actionStatus.set('');
                    this.currentTitle.set(this.model().title);
                    this.tools.alert(`${this.model().title} page updated successfully`);
                } else if (response.url) {
                    this.router.navigateByUrl(response.url);
                } else {
                    this.router.navigate(['/pages']);
                }
            },
            error: (err) => {
                this.actionStatus.set('');
                this.tools.alert(err?.error?.error ?? err?.error ?? 'Error saving');
            },
        });
    }

    removeDialog(): void {
        this.tools
            .confirm(`Are you sure you want to delete ${this.model().title}?`)
            .subscribe((ok) => {
                if (ok) {
                    this.remove();
                }
            });
    }

    private remove(): void {
        this.actionStatus.set('remove');
        this.pagesService.remove(this.model()._id!).subscribe({
            next: () => this.router.navigate(['/pages']),
            error: () => {
                this.actionStatus.set('');
                this.tools.alert(`There was an error removing ${this.model().title} page`);
            },
        });
    }
}
