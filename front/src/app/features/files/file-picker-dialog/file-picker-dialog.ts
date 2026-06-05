import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FileItem } from '../../../models/models';
import { FilesComponent } from '../files/files';

@Component({
    selector: 'app-file-picker-dialog',
    imports: [FilesComponent],
    templateUrl: './file-picker-dialog.html',
    styleUrl: './file-picker-dialog.scss',
})
export class FilePickerDialogComponent {
    private ref = inject(MatDialogRef<FilePickerDialogComponent, FileItem>);

    select(file: FileItem): void {
        this.ref.close(file);
    }
}
