import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { FileItem } from '../../../models/models';
import { FilesService, FileMeta } from '../../../core/files.service';
import { ToolsService } from '../../../core/tools.service';
import { BytesPipe } from '../../../shared/bytes.pipe';
import { InfiniteScrollDirective } from '../../../shared/infinite-scroll.directive';

interface PendingUpload {
    file: File;
    meta: FileMeta & { catalogues?: string[] };
}

@Component({
    selector: 'app-files',
    imports: [
        FormsModule,
        MatTabsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatProgressBarModule,
        BytesPipe,
        InfiniteScrollDirective,
    ],
    templateUrl: './files.html',
    styleUrl: './files.scss',
})
export class FilesComponent implements OnInit {
    readonly allFiles = input<FileItem[]>([]);

    private filesService = inject(FilesService);
    private tools = inject(ToolsService);

    protected readonly files = signal<FileItem[]>([]);
    protected readonly catalogues = signal<string[]>([]);
    protected readonly searchText = signal('');
    protected readonly searchCatalogues = signal<string[]>([]);
    protected readonly limit = signal(80);
    protected readonly selected = signal<FileItem | undefined>(undefined);
    protected readonly newCatalogue = signal('');

    protected readonly pending = signal<PendingUpload[]>([]);
    protected readonly progress = signal(0);
    protected readonly actionStatus = signal<'' | 'upload' | 'save' | 'delete'>('');
    protected readonly importStatus = signal(false);
    protected readonly exportStatus = signal(false);

    protected readonly filtered = computed(() => {
        let list = this.files();
        const text = this.searchText().toLowerCase();
        if (text) {
            list = list.filter((f) => JSON.stringify(f).toLowerCase().includes(text));
        }
        const cats = this.searchCatalogues();
        if (cats.length) {
            list = list.filter((f) => (f.catalogues ?? []).some((c) => cats.indexOf(c) > -1));
        }
        return list;
    });
    protected readonly visible = computed(() => this.filtered().slice(0, this.limit()));

    ngOnInit(): void {
        const files = this.allFiles() ?? [];
        this.files.set(files);
        this.deriveCatalogues(files);
    }

    // ---- catalogues -----------------------------------------------------------

    private deriveCatalogues(files: FileItem[]): void {
        const set = new Set<string>(this.filesService.catalogues());
        files.forEach((f) => (f.catalogues ?? []).forEach((c) => set.add(c.toLowerCase())));
        const list = Array.from(set).sort();
        this.catalogues.set(list);
        this.filesService.setCatalogues(list);
    }

    addCatalogue(): void {
        const value = this.newCatalogue().trim().toLowerCase();
        this.newCatalogue.set('');
        if (value && this.catalogues().indexOf(value) === -1) {
            const list = [...this.catalogues(), value].sort();
            this.catalogues.set(list);
            this.filesService.setCatalogues(list);
        }
    }

    // ---- selection / edit -----------------------------------------------------

    select(file: FileItem): void {
        this.selected.set(file);
    }

    isImage(file: FileItem | undefined): boolean {
        return !!file && file.type !== 'application/pdf';
    }

    saveFile(): void {
        const file = this.selected();
        if (!file) return;
        this.actionStatus.set('save');
        this.filesService.edit(file).subscribe({
            next: () => {
                this.actionStatus.set('');
                this.deriveCatalogues(this.files());
                this.tools.alert(`${file.filename} saved successfully`);
            },
            error: (e) => {
                this.actionStatus.set('');
                this.tools.alert(e?.error?.error ?? e?.error ?? 'Error saving');
            },
        });
    }

    deleteDialog(): void {
        const file = this.selected();
        if (!file) return;
        this.tools.confirm(`Are you sure you want to delete ${file.filename}?`).subscribe((ok) => {
            if (ok) this.deleteFile(file);
        });
    }

    private deleteFile(file: FileItem): void {
        this.actionStatus.set('delete');
        this.filesService.remove(file._id!).subscribe({
            next: () => {
                this.actionStatus.set('');
                this.files.update((list) => list.filter((f) => f !== file));
                this.selected.set(undefined);
                this.tools.alert(`${file.filename} removed successfully`);
            },
            error: (e) => {
                this.actionStatus.set('');
                this.tools.alert(e?.error?.error ?? e?.error ?? 'Error removing');
            },
        });
    }

    incrementLimit(): void {
        if (this.files().length > this.limit()) {
            this.limit.update((l) => l + 40);
        }
    }

    // ---- upload ---------------------------------------------------------------

    onFilesSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        const list = Array.from(input.files ?? []);
        this.pending.set(list.map((file) => ({ file, meta: { catalogues: [] } })));
    }

    removePending(index: number): void {
        this.pending.update((list) => list.filter((_, i) => i !== index));
    }

    upload(): void {
        const pending = this.pending();
        if (!pending.length) return;

        const filesData: Record<string, FileMeta> = {};
        pending.forEach((p) => (filesData[p.file.name] = p.meta));

        this.actionStatus.set('upload');
        this.progress.set(0);
        this.filesService
            .upload(
                pending.map((p) => p.file),
                filesData,
            )
            .subscribe({
                next: (event) => {
                    if (event.type === HttpEventType.UploadProgress && event.total) {
                        this.progress.set(Math.round((100 * event.loaded) / event.total));
                    } else if (event.type === HttpEventType.Response) {
                        this.actionStatus.set('');
                        const uploaded = event.body ?? [];
                        if (uploaded.length) {
                            this.files.update((list) => [...list, ...uploaded]);
                            this.deriveCatalogues(this.files());
                            this.pending.set([]);
                            this.tools.alert('Files uploaded successfully');
                        }
                    }
                },
                error: (e) => {
                    this.actionStatus.set('');
                    this.tools.alert(e?.error?.error ?? e?.error ?? 'Error uploading');
                },
            });
    }

    // ---- import / export ------------------------------------------------------

    onImportFile(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        const oldLength = this.files().length;
        const reader = new FileReader();
        reader.onload = () => {
            let files: unknown;
            try {
                files = JSON.parse(reader.result as string);
            } catch {
                this.tools.alert('Wrong file format!');
                return;
            }
            if (Array.isArray(files) && files.length) {
                this.importStatus.set(true);
                this.filesService.importData({ files: files as FileItem[] }).subscribe({
                    next: (response) => {
                        this.importStatus.set(false);
                        const added = response.length - oldLength;
                        this.files.set(response);
                        this.deriveCatalogues(response);
                        this.tools.alert(
                            `${added} files ${added > 1 ? 'were' : 'was'} successfully imported`,
                        );
                    },
                    error: (error) => {
                        this.importStatus.set(false);
                        this.tools.alert(error?.error?.error ?? 'There was an error importing');
                    },
                });
            } else {
                this.tools.alert('There is no correct files to import');
            }
        };
        reader.readAsText(file);
        input.value = '';
    }

    export(): void {
        this.exportStatus.set(true);
        this.filesService.exportData().subscribe({
            next: (path) => {
                this.exportStatus.set(false);
                const a = document.createElement('a');
                a.setAttribute('href', path);
                a.setAttribute('download', '');
                a.click();
            },
            error: () => {
                this.exportStatus.set(false);
                this.tools.alert('There was an error exporting');
            },
        });
    }
}
