import {
    Component,
    OnInit,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { FileItem } from '../../../models/models';
import { FilesService, FileMeta } from '../../../core/files.service';
import { ToolsService } from '../../../core/tools.service';
import { BytesPipe } from '../../../shared/bytes.pipe';
import { ImgLoadedDirective } from '../../../shared/img-loaded.directive';
import { InfiniteScrollDirective } from '../../../shared/infinite-scroll.directive';

interface PendingUpload {
    file: File;
    previewUrl: string;
    meta: FileMeta;
}

@Component({
    selector: 'app-files',
    imports: [
        DatePipe,
        FormsModule,
        MatTabsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatProgressBarModule,
        MatDialogModule,
        BytesPipe,
        ImgLoadedDirective,
        InfiniteScrollDirective,
    ],
    templateUrl: './files.html',
    styleUrl: './files.scss',
})
export class FilesComponent implements OnInit {
    readonly allFiles = input<FileItem[]>([]);
    readonly isPopup = input(false);
    readonly fileSelected = output<FileItem>();

    private readonly tabs = viewChild.required<MatTabGroup>('tabs');
    private filesService = inject(FilesService);
    private tools = inject(ToolsService);

    protected readonly files = signal<FileItem[]>([]);
    protected readonly catalogues = signal<string[]>([]);
    protected readonly searchText = signal('');
    protected readonly searchCatalogues = signal<string[]>([]);
    protected readonly limit = signal(120);
    protected readonly selected = signal<FileItem | undefined>(undefined);
    protected readonly newCatalogue = signal('');
    protected readonly newCataloguePending = signal('');

    protected readonly pending = signal<PendingUpload[]>([]);
    protected readonly selectedPending = signal<number | null>(null);
    protected readonly selectedPendingItem = computed(() => {
        const i = this.selectedPending();
        return i !== null ? this.pending()[i] : undefined;
    });
    protected readonly progress = signal(0);
    protected readonly actionStatus = signal<'' | 'upload' | 'save' | 'delete'>('');
    protected readonly importStatus = signal(false);
    protected readonly exportStatus = signal(false);

    private readonly selectionGuard = effect(() => {
        const list = this.filtered();
        const sel = this.selected();
        if (sel !== undefined && !list.includes(sel)) {
            this.selected.set(list.length ? list[0] : undefined);
        }
    });

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
        if (this.isPopup()) {
            this.filesService.getAllFiles().subscribe((files) => {
                const list = files ?? [];
                this.files.set(list);
                this.deriveCatalogues(list);
            });
        } else {
            const files = this.allFiles() ?? [];
            this.files.set(files);
            this.deriveCatalogues(files);
        }
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

    addCataloguePending(): void {
        const value = this.newCataloguePending().trim().toLowerCase();
        this.newCataloguePending.set('');
        if (!value) return;
        if (this.catalogues().indexOf(value) === -1) {
            const list = [...this.catalogues(), value].sort();
            this.catalogues.set(list);
            this.filesService.setCatalogues(list);
        }
        const i = this.selectedPending();
        if (i === null) return;
        this.pending.update((list) =>
            list.map((item, idx) => {
                if (idx !== i) return item;
                const cats = item.meta.catalogues ?? [];
                if (cats.includes(value)) return item;
                return { ...item, meta: { ...item.meta, catalogues: [...cats, value] } };
            }),
        );
    }

    // ---- selection / edit -----------------------------------------------------

    select(file: FileItem): void {
        this.selected.set(file);
    }

    chooseSelected(): void {
        const file = this.selected();
        if (file) this.fileSelected.emit(file);
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

    selectPending(i: number): void {
        this.selectedPending.set(i);
    }

    clearPending(): void {
        this.pending().forEach((p) => {
            if (p.previewUrl.startsWith('blob:')) URL.revokeObjectURL(p.previewUrl);
        });
        this.pending.set([]);
        this.selectedPending.set(null);
    }

    onFilesSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        const list = Array.from(input.files ?? []);
        if (!list.length) return;
        this.pending.set(
            list.map((file) => ({
                file,
                previewUrl: file.type.startsWith('image/')
                    ? URL.createObjectURL(file)
                    : 'images/pdf-placeholder.png',
                meta: { catalogues: [] },
            })),
        );
        this.selectedPending.set(0);
        input.value = '';
    }

    removePending(index: number): void {
        const item = this.pending()[index];
        if (item?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
        this.pending.update((list) => list.filter((_, i) => i !== index));
        const newLen = this.pending().length;
        if (newLen === 0) {
            this.selectedPending.set(null);
            return;
        }
        const sel = this.selectedPending();
        if (sel === null) return;
        if (sel > index) this.selectedPending.set(sel - 1);
        else if (sel === index) this.selectedPending.set(Math.min(sel, newLen - 1));
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
                            this.clearPending();
                            this.tabs().selectedIndex = 0;
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
