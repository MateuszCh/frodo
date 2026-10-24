import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ComponentEntity, Page } from '../../../models/models';
import { PagesService } from '../../../core/pages.service';
import { ToolsService } from '../../../core/tools.service';
import { AddComponentComponent } from '../add-component/add-component';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
    selector: 'app-page',
    imports: [
        FormsModule,
        DragDropModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        AddComponentComponent,
    ],
    templateUrl: './page.html',
})
export class PageComponent implements OnInit {
    protected readonly t = inject(I18nService).t;
    readonly components = input<ComponentEntity[]>([]);
    readonly page = input<Page>();

    private router = inject(Router);
    private pagesService = inject(PagesService);
    private tools = inject(ToolsService);

    protected readonly model = signal<Page>({ title: '', pageUrl: '', rows: [] });
    protected readonly currentTitle = signal('');
    protected readonly actionStatus = signal<'' | 'save' | 'remove'>('');
    protected readonly edit = computed(() => !!this.page());
    protected readonly rows = computed(() => this.model().rows);

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
        this.model().rows.push({ data: {}, title: '', type: '' });
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
                    this.tools.alert(this.t('page.updated', { title: this.model().title }));
                } else if (response.url) {
                    this.router.navigateByUrl(response.url);
                } else {
                    this.router.navigate(['/pages']);
                }
            },
            error: (err) => {
                this.actionStatus.set('');
                this.tools.alert(err?.error?.error ?? err?.error ?? this.t('common.errorSaving'));
            },
        });
    }

    removeDialog(): void {
        this.tools
            .confirm(this.t('common.confirmDelete', { name: this.model().title }))
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
                this.tools.alert(this.t('page.removeError', { title: this.model().title }));
            },
        });
    }
}
