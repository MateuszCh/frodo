import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FilesService } from '../../../core/files.service';
import { FileItem } from '../../../models/models';

/** Popup file chooser (port of files-dialog.html + <files is-popup>). */
@Component({
    selector: 'app-file-picker-dialog',
    imports: [
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
    ],
    templateUrl: './file-picker-dialog.html',
    styleUrl: './file-picker-dialog.scss',
})
export class FilePickerDialogComponent {
    private filesService = inject(FilesService);
    private ref = inject(MatDialogRef<FilePickerDialogComponent, FileItem>);

    protected readonly search = signal('');
    private readonly files = signal<FileItem[]>([]);

    protected readonly filtered = computed(() => {
        const term = this.search().toLowerCase();
        if (!term) return this.files();
        return this.files().filter((f) => JSON.stringify(f).toLowerCase().includes(term));
    });

    constructor() {
        this.filesService.getAllFiles().subscribe((files) => this.files.set(files ?? []));
    }

    select(file: FileItem): void {
        this.ref.close(file);
    }
}
