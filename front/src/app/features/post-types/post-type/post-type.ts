import {
    Component,
    OnInit,
    computed,
    effect,
    inject,
    input,
    signal,
    viewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ComponentEntity, Field, PostType } from '../../../models/models';
import { blankField, formatKey } from '../../../models/fields';
import { PostTypesService } from '../../../core/post-types.service';
import { ComponentsService } from '../../../core/components.service';
import { ToolsService } from '../../../core/tools.service';
import { AddFieldComponent } from '../add-field/add-field';
import { I18nService } from '../../../core/i18n/i18n.service';
import { CollapseDirective, collapsibleList } from '../../../shared/collapse.directive';
import { CollapseToggleComponent } from '../../../shared/collapse-toggle/collapse-toggle';

type Schema = PostType & ComponentEntity;

@Component({
    selector: 'app-post-type',
    imports: [
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        AddFieldComponent,
        CollapseDirective,
        CollapseToggleComponent,
    ],
    templateUrl: './post-type.html',
})
export class PostTypeComponent implements OnInit {
    protected readonly t = inject(I18nService).t;

    // resolved (edit) + route data
    readonly postType = input<PostType | ComponentEntity>();
    readonly family = input<string>('');

    private router = inject(Router);
    private tools = inject(ToolsService);
    private postTypesService = inject(PostTypesService);
    private componentsService = inject(ComponentsService);

    protected readonly model = signal<Schema>(this.blankModel('postTypes'));
    protected readonly currentType = signal('');
    protected readonly actionStatus = signal<'' | 'save' | 'remove'>('');

    protected readonly isComponent = computed(() => this.family() === 'components');
    protected readonly edit = computed(() => !!this.postType());

    private readonly fieldCards = viewChildren(AddFieldComponent);
    protected readonly fieldList = collapsibleList(() =>
        this.fieldCards().map((card) => card.collapse),
    );

    constructor() {
        effect(() => {
            const resolved = this.postType();
            if (resolved) {
                this.model.set(resolved as Schema);
                this.currentType.set(resolved.type);
            } else {
                this.model.set(this.blankModel(this.family()));
            }
        });
    }

    ngOnInit(): void {
        if (!this.postType()) {
            this.model.set(this.blankModel(this.family()));
        }
    }

    /** A card of this editor, remembered for all post types (or all components). */
    protected sectionKey(section: string): string {
        return `section:${this.isComponent() ? 'component' : 'post-type'}/${section}`;
    }

    /** A field definition, remembered by the type key and the field id, once both are set. */
    protected fieldKey(field: Field): string | null {
        const type = this.model().type;
        return type && field.id
            ? `def:${this.isComponent() ? 'component' : 'post-type'}:${type}/${field.id}`
            : null;
    }

    addField(): void {
        this.model().fields.push(blankField());
        this.model.set({ ...this.model() });
    }

    removeField(index: number): void {
        this.model().fields.splice(index, 1);
        this.model.set({ ...this.model() });
    }

    formatType(): void {
        const m = this.model();
        if (m.type) {
            m.type = formatKey(m.type);
        }
    }

    save(form: NgForm): void {
        if (!form.valid) {
            form.control.markAllAsTouched();
            this.tools.scrollToError();
            return;
        }
        this.actionStatus.set('save');
        const editing = this.edit();
        const request = editing ? this.api().edit(this.model()) : this.api().create(this.model());

        request.subscribe({
            next: (response) => {
                this.postTypesService.refreshMenu();
                if (editing) {
                    this.actionStatus.set('');
                    this.model.set(response as Schema);
                    this.currentType.set((response as Schema).type);
                    this.tools.alert(this.t('schema.updated', { type: (response as Schema).type }));
                } else {
                    this.navigateAfterCreate(response as Schema);
                }
            },
            error: (err) => {
                this.actionStatus.set('');
                this.tools.alert(err?.error?.error ?? err?.error ?? this.t('common.errorSaving'));
            },
        });
    }

    removeDialog(): void {
        const m = this.model();
        this.tools.confirm(this.t('common.confirmDelete', { name: m.type })).subscribe((ok) => {
            if (ok) {
                this.remove();
            }
        });
    }

    private remove(): void {
        this.actionStatus.set('remove');
        this.api()
            .remove(this.model()._id!)
            .subscribe({
                next: () => {
                    this.postTypesService.refreshMenu();
                    this.router.navigate([this.isComponent() ? '/components' : '/post-types']);
                },
                error: () => {
                    this.actionStatus.set('');
                    this.tools.alert(
                        this.t(this.isComponent() ? 'schema.removeErrorComponent' : 'schema.removeErrorPostType', {
                            type: this.model().type,
                        }),
                    );
                },
            });
    }

    private navigateAfterCreate(response: Schema): void {
        const base = this.isComponent() ? '/components/edit' : '/post-types/edit';
        if (response.url) {
            this.router.navigateByUrl(response.url);
        } else {
            this.router.navigate([base, response.id]);
        }
    }

    private api(): {
        create: (d: Schema) => Observable<unknown>;
        edit: (d: Schema) => Observable<unknown>;
        remove: (id: string) => Observable<string>;
    } {
        return this.isComponent()
            ? {
                  create: (d) => this.componentsService.create(d),
                  edit: (d) => this.componentsService.edit(d),
                  remove: (id) => this.componentsService.remove(id),
              }
            : {
                  create: (d) => this.postTypesService.create(d),
                  edit: (d) => this.postTypesService.edit(d),
                  remove: (id) => this.postTypesService.remove(id),
              };
    }

    private blankModel(family: string): Schema {
        return family === 'components'
            ? ({ title: '', type: '', fields: [] } as unknown as Schema)
            : ({
                  title: '',
                  pluralTitle: '',
                  type: '',
                  fields: [],
                  posts: [],
              } as unknown as Schema);
    }
}
