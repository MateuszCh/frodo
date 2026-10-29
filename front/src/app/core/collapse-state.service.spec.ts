import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { CollapseStateService } from './collapse-state.service';

function makeWindow(saved: string | null) {
    const store = new Map<string, string>();
    if (saved !== null) {
        store.set('frodo.expanded', saved);
    }
    return {
        store,
        localStorage: {
            getItem: vi.fn((key: string) => store.get(key) ?? null),
            setItem: vi.fn((key: string, value: string) => void store.set(key, value)),
        },
    };
}

function createService(win: object | null): CollapseStateService {
    TestBed.configureTestingModule({
        providers: [{ provide: DOCUMENT, useValue: { defaultView: win } }],
    });
    return TestBed.inject(CollapseStateService);
}

afterEach(() => TestBed.resetTestingModule());

describe('CollapseStateService', () => {
    it('starts from the saved keys', () => {
        const service = createService(makeWindow('["section:page/seo"]'));

        expect(service.isExpanded('section:page/seo')).toBe(true);
        expect(service.isExpanded('section:page/basic')).toBe(false);
    });

    it('stores only the expanded keys, as one entry', () => {
        const win = makeWindow(null);
        const service = createService(win);

        service.set('a', true);
        service.set('b', true);
        service.set('a', false);

        expect(service.isExpanded('a')).toBe(false);
        expect(service.isExpanded('b')).toBe(true);
        expect(JSON.parse(win.store.get('frodo.expanded')!)).toEqual(['b']);
    });

    it('keeps the 300 newest keys', () => {
        const win = makeWindow(null);
        const service = createService(win);

        for (let i = 0; i < 302; i++) {
            service.set(`k${i}`, true);
        }
        // expanding a key again makes it the newest
        service.set('k2', true);
        service.set('k302', true);

        const saved: string[] = JSON.parse(win.store.get('frodo.expanded')!);
        expect(saved).toHaveLength(300);
        expect(saved.slice(-2)).toEqual(['k2', 'k302']);
        expect(service.isExpanded('k3')).toBe(false);
        expect(service.isExpanded('k4')).toBe(true);
    });

    it('ignores a broken entry', () => {
        expect(createService(makeWindow('{not json')).isExpanded('a')).toBe(false);
        TestBed.resetTestingModule();
        expect(createService(makeWindow('{"a": true}')).isExpanded('a')).toBe(false);
        TestBed.resetTestingModule();
        expect(createService(makeWindow('["a", 1]')).isExpanded('a')).toBe(true);
    });

    it('sets several keys with one write', () => {
        const win = makeWindow('["a"]');
        const service = createService(win);

        service.set(['b', 'c'], true);
        service.set(['a', 'b'], false);
        service.set([], true);

        expect(win.localStorage.setItem).toHaveBeenCalledTimes(2);
        expect(JSON.parse(win.store.get('frodo.expanded')!)).toEqual(['c']);
    });

    it('keeps the keys another tab saved since this one started', () => {
        const win = makeWindow(null);
        const tabA = createService(win);
        TestBed.resetTestingModule();
        const tabB = createService(win);

        tabA.set('section:page/seo', true);
        tabB.set('rows:post:marker/gallery', true);

        expect(JSON.parse(win.store.get('frodo.expanded')!)).toEqual([
            'section:page/seo',
            'rows:post:marker/gallery',
        ]);
        expect(tabB.isExpanded('section:page/seo')).toBe(true);
    });

    it('works for the page alone when the storage is unavailable', () => {
        const win = {
            localStorage: {
                getItem: () => {
                    throw new Error('denied');
                },
                setItem: () => {
                    throw new Error('denied');
                },
            },
        };
        const service = createService(win);

        expect(() => service.set('a', true)).not.toThrow();
        expect(service.isExpanded('a')).toBe(true);
    });
});
