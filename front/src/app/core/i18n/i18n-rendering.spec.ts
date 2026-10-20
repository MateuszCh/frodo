import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { I18nService } from './i18n.service';
import { MessageDialogComponent } from '../dialogs/message-dialog/message-dialog';
import { LanguageSwitchComponent } from '../../layout/language-switch/language-switch';
import { ListingComponent } from '../../features/listing/listing/listing';
import { LayoutService } from '../layout.service';
import { ToolsService } from '../tools.service';
import { PagesService } from '../pages.service';
import { PostsService } from '../posts.service';
import { PostTypesService } from '../post-types.service';
import { ComponentsService } from '../components.service';
import { FilesService } from '../files.service';

// Polish is the default interface language; a switch re-renders without a reload.

afterEach(() => localStorage.removeItem('frodo.lang'));

function buttonTexts(root: HTMLElement): string[] {
    return Array.from(root.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
}

describe('Polish interface', () => {
    it('renders the confirm dialog in Polish and switches to English live', () => {
        TestBed.configureTestingModule({
            imports: [MessageDialogComponent],
            providers: [
                provideNoopAnimations(),
                { provide: MAT_DIALOG_DATA, useValue: { message: 'Usunąć?', confirm: true } },
                { provide: MatDialogRef, useValue: { close: vi.fn() } },
            ],
        });
        const fixture = TestBed.createComponent(MessageDialogComponent);
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;

        expect(root.querySelector('[mat-dialog-title]')?.textContent?.trim()).toBe('Potwierdź usunięcie');
        expect(buttonTexts(root)).toEqual(['Anuluj', 'Usuń']);

        TestBed.inject(I18nService).set('en');
        fixture.detectChanges();

        expect(root.querySelector('[mat-dialog-title]')?.textContent?.trim()).toBe('Confirm deletion');
        expect(buttonTexts(root)).toEqual(['Cancel', 'Delete']);
    });

    it('shows a backend message in an alert in Polish', () => {
        TestBed.configureTestingModule({
            imports: [MessageDialogComponent],
            providers: [
                provideNoopAnimations(),
                { provide: MAT_DIALOG_DATA, useValue: { message: 'Duplicate field ids', confirm: false } },
                { provide: MatDialogRef, useValue: { close: vi.fn() } },
            ],
        });
        const fixture = TestBed.createComponent(MessageDialogComponent);
        fixture.detectChanges();
        const content = () => fixture.nativeElement.querySelector('mat-dialog-content').textContent.trim();

        expect(content()).toBe('Id pól powtarzają się');
        expect(buttonTexts(fixture.nativeElement)).toEqual(['OK']);

        TestBed.inject(I18nService).set('en');
        fixture.detectChanges();
        expect(content()).toBe('Duplicate field ids');
    });

    it('renders an empty pages listing in Polish', () => {
        TestBed.configureTestingModule({
            imports: [ListingComponent],
            providers: [
                provideRouter([]),
                provideLocationMocks(),
                provideNoopAnimations(),
                { provide: LayoutService, useValue: { size: signal('size-x') } },
                { provide: ToolsService, useValue: { confirm: vi.fn(() => of(true)), alert: vi.fn() } },
                { provide: PagesService, useValue: {} },
                { provide: PostsService, useValue: {} },
                { provide: PostTypesService, useValue: {} },
                { provide: ComponentsService, useValue: {} },
                { provide: FilesService, useValue: { catalogues: signal<string[]>([]) } },
            ],
        });
        const fixture = TestBed.createComponent(ListingComponent);
        fixture.componentRef.setInput('family', 'pages');
        fixture.componentRef.setInput('model', []);
        fixture.detectChanges();
        const root: HTMLElement = fixture.nativeElement;

        expect(root.querySelector('.page-title')?.textContent?.trim()).toBe('strony');
        expect(buttonTexts(root)).toContain('Nowa strona');
        expect(root.querySelector('.empty__title')?.textContent?.trim()).toBe('Brak stron');
        expect((root.querySelector('input[type="search"]') as HTMLInputElement).placeholder).toBe('Szukaj stron');
    });

    it('names the "New" action after the gender of the post type', () => {
        TestBed.configureTestingModule({
            imports: [ListingComponent],
            providers: [
                provideRouter([]),
                provideLocationMocks(),
                provideNoopAnimations(),
                { provide: LayoutService, useValue: { size: signal('size-x') } },
                { provide: ToolsService, useValue: { confirm: vi.fn(() => of(true)), alert: vi.fn() } },
                { provide: PagesService, useValue: {} },
                { provide: PostsService, useValue: {} },
                { provide: PostTypesService, useValue: {} },
                { provide: ComponentsService, useValue: {} },
                { provide: FilesService, useValue: { catalogues: signal<string[]>([]) } },
            ],
        });
        const fixture = TestBed.createComponent(ListingComponent);
        fixture.componentRef.setInput('family', 'posts');
        fixture.componentRef.setInput('model', {
            _id: 'pt1', id: 1, title: 'Ikona', pluralTitle: 'Ikony', type: 'icon', fields: [], posts: [],
        });
        fixture.detectChanges();

        expect(buttonTexts(fixture.nativeElement)).toContain('Nowa ikona');
    });
});

describe('LanguageSwitchComponent', () => {
    it('shows the current language and remembers a new choice', () => {
        TestBed.configureTestingModule({ imports: [LanguageSwitchComponent] });
        const fixture = TestBed.createComponent(LanguageSwitchComponent);
        fixture.detectChanges();
        const [pl, en] = Array.from<HTMLInputElement>(fixture.nativeElement.querySelectorAll('input[type="radio"]'));

        expect(pl.checked).toBe(true);
        expect(en.checked).toBe(false);
        expect(fixture.nativeElement.querySelector('[role="radiogroup"]').getAttribute('aria-label')).toBe('Język');

        en.click();
        fixture.detectChanges();

        expect(TestBed.inject(I18nService).lang()).toBe('en');
        expect(localStorage.getItem('frodo.lang')).toBe('en');
        expect(fixture.nativeElement.querySelector('[role="radiogroup"]').getAttribute('aria-label')).toBe('Language');
    });
});
