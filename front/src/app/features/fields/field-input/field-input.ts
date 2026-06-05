import { Component, OnInit, forwardRef, inject, input } from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { Field } from '../../../models/models';
import { FilesService } from '../../../core/files.service';
import { parseOptions } from '../../../shared/parse-options';
import { FilePickerDialogComponent } from '../../files/file-picker-dialog/file-picker-dialog';
import { RepeaterComponent } from '../repeater/repeater';

/**
 * Port of field.component.js — renders the right input for a field type,
 * bound to `model[field.id]`. Used by the post editor and the repeater rows.
 */
@Component({
    selector: 'app-field',
    // share the ancestor <form> so ngModel controls register for validation
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    providers: [provideNativeDateAdapter()],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatButtonModule,
        forwardRef(() => RepeaterComponent),
    ],
    templateUrl: './field-input.html',
})
export class FieldInputComponent implements OnInit {
    readonly field = input.required<Field>();
    readonly model = input.required<Record<string, unknown>>();
    /** prefix to keep ngModel control names unique (e.g. across repeater rows). */
    readonly namePrefix = input<string>('');

    private filesService = inject(FilesService);
    private dialog = inject(MatDialog);

    protected options: string[] = [];
    protected multiOptions: string[] = [];
    protected readonly catalogues = this.filesService.catalogues;

    ngOnInit(): void {
        const field = this.field();
        const model = this.model();

        this.options = field.options ?? parseOptions(field.selectOptions);
        this.multiOptions = field.multiOptions ?? parseOptions(field.multiselectOptions);

        if (field.type === 'checkbox' && model[field.id] == null) {
            model[field.id] = false;
        }
        if (
            field.type === 'date' &&
            model[field.id] != null &&
            !(model[field.id] instanceof Date)
        ) {
            model[field.id] = new Date(model[field.id] as string | number);
        }
    }

    clear(): void {
        this.model()[this.field().id] = null;
    }

    openFiles(): void {
        this.dialog
            .open(FilePickerDialogComponent, { maxWidth: '90vw' })
            .afterClosed()
            .subscribe((file) => {
                if (file) {
                    this.model()[this.field().id] = file.src;
                }
            });
    }
}
