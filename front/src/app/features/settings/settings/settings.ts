import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

import { PageType, Settings } from '../../../models/models';
import { formatKey } from '../../../models/fields';
import { SettingsService } from '../../../core/settings.service';
import { ToolsService } from '../../../core/tools.service';
import { PageTypeComponent } from '../page-type/page-type';
import { I18nService } from '../../../core/i18n/i18n.service';

const EXPORT_FILE = 'settings.json';

/** Site-wide configuration: the page types and the fields of each type. */
@Component({
    selector: 'app-settings',
    imports: [FormsModule, MatButtonModule, PageTypeComponent],
    templateUrl: './settings.html',
})
export class SettingsComponent implements OnInit {
    protected readonly t = inject(I18nService).t;
    readonly settings = input<Settings>();

    private settingsService = inject(SettingsService);
    private tools = inject(ToolsService);

    protected readonly model = signal<Settings>({ pageTypes: [] });
    protected readonly saving = signal(false);
    protected readonly exportStatus = signal(false);
    // by page type object, not by key: a new type typed with a used key is not that type
    private usage = new WeakMap<PageType, string[]>();

    ngOnInit(): void {
        this.load(this.settings() ?? { pageTypes: [] });
    }

    protected usedBy(pageType: PageType): string[] {
        return this.usage.get(pageType) ?? [];
    }

    addPageType(): void {
        this.model().pageTypes.push({ title: '', type: '', fields: [] });
        this.model.set({ ...this.model() });
    }

    removePageType(index: number): void {
        // pages keep the key of their type: the server would reject the save
        if (this.usedBy(this.model().pageTypes[index]).length) {
            return;
        }
        this.model().pageTypes.splice(index, 1);
        this.model.set({ ...this.model() });
    }

    save(form: NgForm): void {
        if (!form.valid) {
            form.control.markAllAsTouched();
            this.tools.scrollToError();
            return;
        }
        this.saving.set(true);
        this.settingsService.edit({ pageTypes: this.model().pageTypes }).subscribe({
            next: (settings) => {
                this.saving.set(false);
                this.load(settings);
                this.tools.alert(this.t('settings.saved'));
            },
            error: (err) => {
                this.saving.set(false);
                this.tools.alert(err?.error?.error ?? err?.error ?? this.t('common.errorSaving'));
            },
        });
    }

    // ---- import / export ------------------------------------------------------

    /** Downloads the saved page types, to import them into another Frodo. */
    export(): void {
        this.exportStatus.set(true);
        this.settingsService.get().subscribe({
            next: (settings) => {
                this.exportStatus.set(false);
                const pageTypes = settings.pageTypes.map(({ title, type, fields }) => ({ title, type, fields }));
                const url = URL.createObjectURL(
                    new Blob([JSON.stringify({ pageTypes }, null, 4)], { type: 'application/json' }),
                );
                const a = document.createElement('a');
                a.setAttribute('href', url);
                a.setAttribute('download', EXPORT_FILE);
                a.click();
                URL.revokeObjectURL(url);
            },
            error: () => {
                this.exportStatus.set(false);
                this.tools.alert(this.t('common.errorExporting'));
            },
        });
    }

    /**
     * Adds the page types of an exported file to the form: a type with a key that is
     * already on the list replaces its title and fields. Nothing is saved until Save,
     * so unsaved changes in the form stay and the server checks everything as usual.
     */
    onImportFile(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            let parsed: unknown;
            try {
                parsed = JSON.parse(reader.result as string);
            } catch {
                this.tools.alert(this.t('common.wrongFileFormat'));
                return;
            }
            const imported = this.importedPageTypes(parsed);
            if (!imported.length) {
                this.tools.alert(this.t('settings.noPageTypesToImport'));
                return;
            }
            const pageTypes = this.model().pageTypes;
            imported.forEach((pageType) => {
                const index = pageTypes.findIndex((candidate) => candidate.type === pageType.type);
                if (index >= 0) {
                    // a new object, so its card renders anew; the pages that use the type stay
                    this.usage.set(pageType, this.usedBy(pageTypes[index]));
                    pageTypes[index] = pageType;
                } else {
                    pageTypes.push(pageType);
                }
            });
            this.model.set({ ...this.model() });
            this.tools.alert(this.t('settings.imported', { count: imported.length }));
        };
        reader.readAsText(file);
        input.value = '';
    }

    /** Page types of an exported file ({ pageTypes } or the list itself) that have a title and a key. */
    private importedPageTypes(parsed: unknown): PageType[] {
        const list = Array.isArray(parsed) ? parsed : (parsed as Partial<Settings> | null)?.pageTypes;
        if (!Array.isArray(list)) {
            return [];
        }
        return list
            .filter(
                (item): item is PageType =>
                    !!item && typeof item.title === 'string' && !!item.title && typeof item.type === 'string' && !!item.type,
            )
            .map((item) => ({
                title: item.title,
                type: formatKey(item.type),
                fields: Array.isArray(item.fields) ? item.fields : [],
            }));
    }

    private load(settings: Settings): void {
        this.usage = new WeakMap();
        settings.pageTypes.forEach((pageType) => this.usage.set(pageType, settings.usage?.[pageType.type] ?? []));
        this.model.set({ pageTypes: settings.pageTypes });
    }
}
