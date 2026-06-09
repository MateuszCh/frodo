import { signal } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { By } from '@angular/platform-browser';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { FilePickerDialogComponent } from './file-picker-dialog';
import { FilesComponent } from '../files/files';
import { FilesService } from '../../../core/files.service';
import { ToolsService } from '../../../core/tools.service';
import type { FileItem } from '../../../models/models';

function setup() {
    const dialogRef = { close: vi.fn() };
    const filesService = {
        getAllFiles: vi.fn().mockReturnValue(of([])),
        catalogues: signal<string[]>([]),
        setCatalogues: vi.fn(),
    };
    TestBed.configureTestingModule({
        imports: [FilePickerDialogComponent, MatIconTestingModule],
        providers: [
            provideNoopAnimations(),
            { provide: MatDialogRef, useValue: dialogRef },
            { provide: FilesService, useValue: filesService },
            { provide: ToolsService, useValue: { alert: vi.fn(), confirm: vi.fn() } },
        ],
    });

    const fixture: ComponentFixture<FilePickerDialogComponent> =
        TestBed.createComponent(FilePickerDialogComponent);
    fixture.detectChanges();
    const files = fixture.debugElement.query(By.directive(FilesComponent))
        .componentInstance as FilesComponent;
    return { fixture, component: fixture.componentInstance, dialogRef, files, filesService };
}

describe('FilePickerDialogComponent', () => {
    it('renders the files browser in popup mode', () => {
        const { files, filesService } = setup();
        expect(files.isPopup()).toBe(true);
        expect(filesService.getAllFiles).toHaveBeenCalled();
    });

    it('select() closes the dialog with the chosen file', () => {
        const { component, dialogRef } = setup();
        const file: FileItem = { _id: 'f1', filename: 'a.jpg', src: '/uploads/a.jpg' };
        component.select(file);
        expect(dialogRef.close).toHaveBeenCalledWith(file);
    });

    it('closes the dialog when the files browser emits fileSelected', () => {
        const { files, dialogRef } = setup();
        const file: FileItem = { _id: 'f2', filename: 'b.pdf' };
        files.fileSelected.emit(file);
        expect(dialogRef.close).toHaveBeenCalledWith(file);
    });
});
