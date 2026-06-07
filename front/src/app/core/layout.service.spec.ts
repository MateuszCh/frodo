import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { LayoutService } from './layout.service';

function makeDoc(innerWidth: number) {
    return {
        body: document.body,
        defaultView: { innerWidth, addEventListener: vi.fn() },
    };
}

afterEach(() => {
    document.body.classList.remove('size-s', 'size-m', 'size-l', 'size-x', 'size-xl');
    TestBed.resetTestingModule();
});

function createService(innerWidth: number): LayoutService {
    TestBed.configureTestingModule({
        providers: [
            LayoutService,
            { provide: DOCUMENT, useValue: makeDoc(innerWidth) },
        ],
    });
    const service = TestBed.inject(LayoutService);
    TestBed.tick();
    return service;
}

// ---------------------------------------------------------------------------
// size signal — computed from innerWidth at construction time
// ---------------------------------------------------------------------------

describe('LayoutService size signal', () => {
    it('returns "size-s" for innerWidth < 600', () => {
        expect(createService(599).size()).toBe('size-s');
    });

    it('returns "size-m" for innerWidth 600–959', () => {
        expect(createService(700).size()).toBe('size-m');
    });

    it('returns "size-l" for innerWidth 960–1279', () => {
        expect(createService(1024).size()).toBe('size-l');
    });

    it('returns "size-x" for innerWidth 1280–1920', () => {
        expect(createService(1500).size()).toBe('size-x');
    });

    it('returns "size-xl" for innerWidth > 1920', () => {
        expect(createService(2000).size()).toBe('size-xl');
    });
});

// ---------------------------------------------------------------------------
// body class sync via effect
// ---------------------------------------------------------------------------

describe('LayoutService body class effect', () => {
    it('adds the current size class to document.body', () => {
        createService(1024); // size-l
        expect(document.body.classList.contains('size-l')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// resize event handler (lines 16-19 in layout.service.ts)
// ---------------------------------------------------------------------------

describe('LayoutService resize handler', () => {
    it('updates size signal when a resize event fires', () => {
        let resizeHandler: (() => void) | undefined;
        const mockDoc = {
            body: document.body,
            defaultView: {
                innerWidth: 1024,
                addEventListener: vi.fn((event: string, handler: () => void) => {
                    if (event === 'resize') {
                        resizeHandler = handler;
                    }
                }),
            },
        };
        // The service uses global requestAnimationFrame — call the callback synchronously
        vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(0);
            return 0;
        });
        vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});

        TestBed.configureTestingModule({
            providers: [LayoutService, { provide: DOCUMENT, useValue: mockDoc }],
        });
        const service = TestBed.inject(LayoutService);
        TestBed.tick();

        // Simulate window resize to a small width
        mockDoc.defaultView.innerWidth = 400;
        resizeHandler?.();

        expect(service.size()).toBe('size-s');

        vi.restoreAllMocks();
    });
});

// ---------------------------------------------------------------------------
// sidenav helpers
// ---------------------------------------------------------------------------

describe('LayoutService sidenav', () => {
    let service: LayoutService;

    beforeEach(() => (service = createService(1024)));

    it('starts with sidenavOpen = false', () => {
        expect(service.sidenavOpen()).toBe(false);
    });

    it('toggleSidenav opens the sidenav', () => {
        service.toggleSidenav();
        expect(service.sidenavOpen()).toBe(true);
    });

    it('toggleSidenav twice closes the sidenav', () => {
        service.toggleSidenav();
        service.toggleSidenav();
        expect(service.sidenavOpen()).toBe(false);
    });

    it('closeSidenav sets sidenavOpen to false', () => {
        service.toggleSidenav();
        service.closeSidenav();
        expect(service.sidenavOpen()).toBe(false);
    });
});
