import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { I18nService } from './i18n.service';
import { en, pl } from './messages';

function makeWindow(saved: string | null) {
    const store = new Map<string, string>();
    if (saved !== null) {
        store.set('frodo.lang', saved);
    }
    return {
        localStorage: {
            getItem: vi.fn((key: string) => store.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => void store.set(key, value)),
        },
    };
}

function createService(win: ReturnType<typeof makeWindow> | null): I18nService {
    const doc = { documentElement: document.createElement('html'), defaultView: win };
    TestBed.configureTestingModule({
        providers: [I18nService, { provide: DOCUMENT, useValue: doc }],
    });
    return TestBed.inject(I18nService);
}

afterEach(() => TestBed.resetTestingModule());

describe('I18nService', () => {
    it('is Polish by default and sets <html lang>', () => {
        const service = createService(makeWindow(null));
        expect(service.lang()).toBe('pl');
        expect(service.locale()).toBe('pl');
        expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('pl');
        expect(service.t('common.save')).toBe('Zapisz');
    });

    it('starts from the saved choice', () => {
        const service = createService(makeWindow('en'));
        expect(service.lang()).toBe('en');
        expect(service.locale()).toBe('en-US');
        expect(service.t('common.save')).toBe('Save');
    });

    it('ignores an unknown saved value', () => {
        expect(createService(makeWindow('de')).lang()).toBe('pl');
    });

    it('set() switches the texts, remembers the choice and updates <html lang>', () => {
        const win = makeWindow(null);
        const service = createService(win);

        service.set('en');

        expect(service.t('nav.pages')).toBe('Pages');
        expect(win.localStorage.setItem).toHaveBeenCalledWith('frodo.lang', 'en');
        expect(TestBed.inject(DOCUMENT).documentElement.lang).toBe('en');
    });

    it('fills in parameters', () => {
        const service = createService(makeWindow(null));
        expect(service.t('common.confirmDelete', { name: 'Kopalnia Guido' })).toBe(
            'Czy na pewno chcesz usunąć „Kopalnia Guido”?',
        );
        // a parameter that is not passed stays visible rather than disappearing
        expect(service.t('listing.deleteItem')).toBe('Usuń: {title}');
    });

    it('picks the Polish plural form from the count', () => {
        const t = createService(makeWindow(null)).t;
        expect(t('files.uploadCount', { count: 1 })).toBe('Prześlij 1 plik');
        expect(t('files.uploadCount', { count: 3 })).toBe('Prześlij 3 pliki');
        expect(t('files.uploadCount', { count: 5 })).toBe('Prześlij 5 plików');
        expect(t('files.uploadCount', { count: 12 })).toBe('Prześlij 12 plików');
        expect(t('files.uploadCount', { count: 22 })).toBe('Prześlij 22 pliki');
        expect(t('files.uploadingCount', { count: 1 })).toBe('Przesyłanie 1 pliku…');
    });

    it('picks the English plural form from the count', () => {
        const t = createService(makeWindow('en')).t;
        expect(t('files.uploadCount', { count: 1 })).toBe('Upload 1 file');
        expect(t('files.uploadCount', { count: 2 })).toBe('Upload 2 files');
    });

    it('returns the key for a key built at runtime that has no text', () => {
        const t = createService(makeWindow(null)).t;
        expect(t('listing.new.' as never)).toBe('listing.new.');
    });

    it('names field types in the current language', () => {
        const service = createService(makeWindow(null));
        expect(service.fieldType('checkbox')).toBe('Tak/Nie');
        service.set('en');
        expect(service.fieldType('checkbox')).toBe('True/False');
    });

    it('works without localStorage (private mode)', () => {
        const win = makeWindow(null);
        win.localStorage.getItem = vi.fn(() => {
            throw new Error('denied');
        });
        win.localStorage.setItem = vi.fn(() => {
            throw new Error('denied');
        });
        const service = createService(win);

        expect(service.lang()).toBe('pl');
        expect(() => service.set('en')).not.toThrow();
        expect(service.lang()).toBe('en');
    });

    it('works without a window', () => {
        expect(createService(null).lang()).toBe('pl');
    });

    it('has an English text for every Polish key and the same plural shape', () => {
        for (const key of Object.keys(pl) as (keyof typeof pl)[]) {
            expect(en[key], key).toBeDefined();
            expect(typeof en[key], key).toBe(typeof pl[key]);
        }
    });
});
