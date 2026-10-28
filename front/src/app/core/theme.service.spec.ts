import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService } from './theme.service';

interface FakeWindow {
    localStorage: Pick<Storage, 'getItem' | 'setItem'>;
    matchMedia: ReturnType<typeof vi.fn>;
}

function makeWindow(saved: string | null, systemDark: boolean): FakeWindow & { emitSystem(dark: boolean): void } {
    const store = new Map<string, string>();
    if (saved !== null) {
        store.set('frodo.theme', saved);
    }
    let listener: ((e: { matches: boolean }) => void) | undefined;
    return {
        localStorage: {
            getItem: vi.fn((key: string) => store.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => void store.set(key, value)),
        },
        matchMedia: vi.fn(() => ({
            matches: systemDark,
            addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => (listener = fn),
        })),
        emitSystem: (dark: boolean) => listener?.({ matches: dark }),
    };
}

function createService(win: FakeWindow | null): ThemeService {
    const doc = { documentElement: document.createElement('html'), defaultView: win };
    TestBed.configureTestingModule({
        providers: [ThemeService, { provide: DOCUMENT, useValue: doc }],
    });
    return TestBed.inject(ThemeService);
}

afterEach(() => TestBed.resetTestingModule());

describe('ThemeService', () => {
    it('starts from the saved choice', () => {
        expect(createService(makeWindow('dark', false)).theme()).toBe('dark');
        TestBed.resetTestingModule();
        expect(createService(makeWindow('light', true)).theme()).toBe('light');
    });

    it('starts from the system setting when nothing is saved', () => {
        expect(createService(makeWindow(null, true)).theme()).toBe('dark');
        TestBed.resetTestingModule();
        expect(createService(makeWindow(null, false)).theme()).toBe('light');
    });

    it('ignores an unknown saved value', () => {
        expect(createService(makeWindow('sepia', true)).theme()).toBe('dark');
    });

    it('set() remembers the choice and sets data-theme on <html>', () => {
        const win = makeWindow(null, false);
        const service = createService(win);
        const html = TestBed.inject(DOCUMENT).documentElement;

        service.set('dark');

        expect(service.theme()).toBe('dark');
        expect(html.dataset['theme']).toBe('dark');
        expect(win.localStorage.setItem).toHaveBeenCalledWith('frodo.theme', 'dark');
    });

    it('follows system changes only while nothing is chosen', () => {
        const win = makeWindow(null, false);
        const service = createService(win);

        win.emitSystem(true);
        expect(service.theme()).toBe('dark');

        service.set('light');
        win.emitSystem(true);
        expect(service.theme()).toBe('light');
    });

    it('works without localStorage (private mode)', () => {
        const win = makeWindow(null, true);
        win.localStorage.getItem = () => {
            throw new Error('denied');
        };
        win.localStorage.setItem = () => {
            throw new Error('denied');
        };
        const service = createService(win);

        expect(service.theme()).toBe('dark');
        expect(() => service.set('light')).not.toThrow();
        expect(service.theme()).toBe('light');
        expect(TestBed.inject(DOCUMENT).documentElement.dataset['theme']).toBe('light');
    });

    it('defaults to light without a window', () => {
        expect(createService(null).theme()).toBe('light');
    });
});
