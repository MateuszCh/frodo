import {
    Component,
    OnInit,
    computed,
    inject,
    input,
    signal,
    viewChild,
    viewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ComponentEntity, Page, Settings } from '../../../models/models';
import { PagesService } from '../../../core/pages.service';
import { ToolsService } from '../../../core/tools.service';
import { AddComponentComponent } from '../add-component/add-component';
import { FieldInputComponent } from '../../fields/field-input/field-input';
import { I18nService } from '../../../core/i18n/i18n.service';
import { CollapseStateService } from '../../../core/collapse-state.service';
import { CollapseDirective, collapsibleList } from '../../../shared/collapse.directive';
import { CollapseToggleComponent } from '../../../shared/collapse-toggle/collapse-toggle';

/** Page components start collapsed; when they were all left expanded, the next page starts so. */
const BLOCKS_KEY = 'rows:page/components';

@Component({
    selector: 'app-page',
    imports: [
        FormsModule,
        DragDropModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        AddComponentComponent,
        FieldInputComponent,
        CollapseDirective,
        CollapseToggleComponent,
    ],
    templateUrl: './page.html',
})
export class PageComponent implements OnInit {
    protected readonly t = inject(I18nService).t;
    readonly components = input<ComponentEntity[]>([]);
    readonly settings = input<Settings>();
    readonly page = input<Page>();

    private router = inject(Router);
    private pagesService = inject(PagesService);
    private tools = inject(ToolsService);
    private collapseState = inject(CollapseStateService);

    protected readonly model = signal<Page>(this.blankModel());
    protected readonly currentTitle = signal('');
    protected readonly actionStatus = signal<'' | 'save' | 'remove'>('');
    protected readonly edit = computed(() => !!this.page());
    protected readonly rows = computed(() => this.model().rows);

    protected readonly pageTypes = computed(() => this.settings()?.pageTypes ?? []);
    protected readonly pageType = computed(() => this.pageTypes().find((type) => type.type === this.model().type));
    protected readonly typeFields = computed(() => this.pageType()?.fields ?? []);
    /** A key the settings do not have (e.g. from an import): an option of its own, so the select is not blank. */
    protected readonly unknownPageType = computed(() => {
        const key = this.model().type;
        return key && !this.pageType() ? key : null;
    });
    private readonly blocks = viewChildren(AddComponentComponent);
    /** The components with fields to show; one without a type (or of a removed one) has none. */
    private readonly blockParts = computed(() =>
        this.blocks()
            .filter((block) => block.hasFields())
            .map((block) => block.collapse),
    );
    protected readonly blockList = collapsibleList(this.blockParts);
    protected readonly blocksStartOpen = this.collapseState.isExpanded(BLOCKS_KEY);
    private readonly typeSection = viewChild<CollapseDirective>('typeSection');
    /** A type chosen in this editor: its fields card opens to be filled in. */
    protected readonly typeChosen = signal(false);
    /** Values of the types chosen before in this editor, by type key (null: no type). */
    private readonly typeDataByType = new Map<string | null, Record<string, unknown>>();

    ngOnInit(): void {
        const existing = this.page();
        if (existing) {
            if (!existing.rows) {
                existing.rows = [];
            }
            if (!existing.typeData) {
                existing.typeData = {};
            }
            this.model.set(existing);
            this.currentTitle.set(existing.title);
        } else {
            this.model.set(this.blankModel());
        }
    }

    /**
     * Back to a type chosen before in this editor: its values as they were. Otherwise the
     * new type gets the values of the fields both types share with the same kind; a value
     * of another kind (a text in a checkbox, a repeater) would be read as the wrong thing.
     */
    selectPageType(type: string | null): void {
        const { type: previous, typeData = {} } = this.model();
        this.typeDataByType.set(previous ?? null, typeData);
        const previousFields = this.typeFields();
        const nextFields = this.pageTypes().find((pageType) => pageType.type === type)?.fields ?? [];
        const carried = nextFields
            .filter((field) => previousFields.some((f) => f.id === field.id && f.type === field.type))
            .filter((field) => Object.prototype.hasOwnProperty.call(typeData, field.id))
            .map((field) => [field.id, typeData[field.id]]);
        const next = this.typeDataByType.get(type) ?? Object.fromEntries(carried);
        this.model.set({ ...this.model(), type, typeData: next });
        // the card of the new type's fields opens: a new card through typeChosen, one that stays here
        this.typeChosen.set(true);
        this.typeSection()?.collapsed.set(false);
    }

    addComponent(): void {
        this.model().rows.push({ data: {}, title: '', type: '' });
        this.model.set({ ...this.model() });
    }

    removeComponent(index: number): void {
        this.model().rows.splice(index, 1);
        this.model.set({ ...this.model() });
    }

    toggleBlocks(): void {
        this.blockList.toggleAll();
        this.rememberBlocks();
    }

    /** After the user collapses or expands components: are they all expanded now. */
    rememberBlocks(): void {
        const parts = this.blockParts();
        this.collapseState.set(
            BLOCKS_KEY,
            parts.length > 0 && parts.every((part) => !part.collapsed()),
        );
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
        // typeData holds only the current type's values (selectPageType); the server drops
        // anything else, e.g. values of fields removed from the type in the settings
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

    private blankModel(): Page {
        return { title: '', pageUrl: '', type: null, typeData: {}, rows: [] };
    }
}
