import {
    Component,
    OnInit,
    computed,
    forwardRef,
    inject,
    input,
    linkedSignal,
} from '@angular/core';
import { FormsModule, ControlContainer, NgForm } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { Field, FieldType } from '../../../models/models';
import { FilesService } from '../../../core/files.service';
import { parseOptions } from '../../../shared/parse-options';
import { FilePickerDialogComponent } from '../../files/file-picker-dialog/file-picker-dialog';
import { RepeaterComponent } from '../repeater/repeater';
import { ComponentFieldComponent } from '../component-field/component-field';
import { PostFieldComponent } from '../post-field/post-field';
import { provideAppDateAdapter } from '../../../core/i18n/date-adapter';
import { I18nService } from '../../../core/i18n/i18n.service';

/** Field types narrow enough to share a line with another one (.fields, _fields.scss). */
const SHORT_TYPES: ReadonlySet<FieldType> = new Set([
    'number',
    'date',
    'select',
    'catalogue',
    'checkbox',
]);

/**
 * Port of field.component.js — renders the right input for a field type,
 * bound to `model[field.id]`. Used by the post editor, the repeater rows and the
 * fields of a nested component.
 */
@Component({
    selector: 'app-field',
    host: {
        class: 'fields__item',
        '[class.fields__item--short]': 'short()',
        '[class.fields__item--checkbox]': "field().type === 'checkbox'",
    },
    // share the ancestor <form> so ngModel controls register for validation
    viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
    providers: [provideAppDateAdapter()],
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatButtonModule,
        // AOT resolves the circular import statically; the arrow only runs
        // when TestBed recompiles the component
        /* v8 ignore next */
        forwardRef(() => RepeaterComponent),
        /* v8 ignore next */
        forwardRef(() => ComponentFieldComponent),
        PostFieldComponent,
    ],
    templateUrl: './field-input.html',
})
export class FieldInputComponent implements OnInit {
    protected readonly t = inject(I18nService).t;
    readonly field = input.required<Field>();
    readonly model = input.required<Record<string, unknown>>();
    /** prefix to keep ngModel control names unique (e.g. across repeater rows). */
    readonly namePrefix = input<string>('');
    /**
     * Place of the field's parent in its schema ("post:marker", "page-type:home/slides"):
     * where a repeater remembers that its rows were left collapsed (CollapseStateService).
     */
    readonly collapseScope = input<string>('');

    protected readonly short = computed(() => SHORT_TYPES.has(this.field().type));

    private filesService = inject(FilesService);
    private dialog = inject(MatDialog);

    protected options: string[] = [];
    protected multiOptions: string[] = [];
    protected readonly catalogues = this.filesService.catalogues;
    /**
     * The file shown: follows the bound model (a row moved up, a model swapped in after a
     * save); Select file and Clear set it.
     */
    protected readonly fileSrc = linkedSignal(() => {
        const field = this.field();
        return field.type === 'file' ? ((this.model()[field.id] as string | null) ?? null) : null;
    });

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
        this.fileSrc.set(null);
    }

    openFiles(): void {
        this.dialog
            .open(FilePickerDialogComponent, { maxWidth: '95vw', width: '90vw', height: '85vh', panelClass: 'file-picker-panel' })
            .afterClosed()
            .subscribe((file) => {
                if (file) {
                    this.model()[this.field().id] = file.src ?? null;
                    this.fileSrc.set(file.src ?? null);
                }
            });
    }
}
