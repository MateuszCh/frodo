import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { PaginationComponent, pageItems } from './pagination';

beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

describe('pageItems', () => {
    it('lists every page when there are few', () => {
        expect(pageItems(1, 1)).toEqual([1]);
        expect(pageItems(2, 3)).toEqual([1, 2, 3]);
        expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('shows the first, the last and the neighbours of the current page with gaps', () => {
        expect(pageItems(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
        expect(pageItems(1, 12)).toEqual([1, 2, null, 12]);
        expect(pageItems(12, 12)).toEqual([1, null, 11, 12]);
    });

    it('shows a single missing page instead of a gap', () => {
        expect(pageItems(4, 12)).toEqual([1, 2, 3, 4, 5, null, 12]);
        expect(pageItems(9, 12)).toEqual([1, null, 8, 9, 10, 11, 12]);
    });
});

describe('PaginationComponent', () => {
    function setup(inputs: { page?: number; pageSize?: number; matched?: number }) {
        TestBed.configureTestingModule({
            imports: [PaginationComponent],
            providers: [provideRouter([]), provideLocationMocks()],
        });
        const fixture = TestBed.createComponent(PaginationComponent);
        Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
        fixture.detectChanges();
        return { fixture, el: fixture.nativeElement as HTMLElement };
    }

    it('renders nothing without items', () => {
        const { el } = setup({ matched: 0 });
        expect(el.querySelector('.pagination')).toBeNull();
    });

    it('shows the range and the size select but no page links on a single page', () => {
        const { el } = setup({ page: 1, pageSize: 20, matched: 7 });
        expect(el.textContent).toContain('1–7 of 7');
        expect(el.querySelector('nav')).toBeNull();
        const options = Array.from(el.querySelectorAll('option')).map((o) => o.textContent);
        expect(options).toEqual(['10', '20', '50', '100']);
        expect((el.querySelector('select') as HTMLSelectElement).value).toBe('20');
    });

    it('links to the previous and next pages, page 1 without a parameter', () => {
        const { el } = setup({ page: 2, pageSize: 10, matched: 25 });
        expect(el.textContent).toContain('11–20 of 25');
        const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('nav a'));
        expect(links.map((a) => a.getAttribute('aria-label'))).toEqual([
            'Previous page',
            'Page 1',
            'Page 3',
            'Next page',
        ]);
        expect(links[0].getAttribute('href')).toBe('/');
        expect(links[2].getAttribute('href')).toBe('/?page=3');
        expect(el.querySelector('[aria-current="page"]')?.textContent).toContain('2');
    });

    it('has no next link on the last page', () => {
        const { el } = setup({ page: 3, pageSize: 10, matched: 25 });
        expect(el.textContent).toContain('21–25 of 25');
        const labels = Array.from(el.querySelectorAll('nav a')).map((a) => a.getAttribute('aria-label'));
        expect(labels).not.toContain('Next page');
    });

    it('emits the chosen page size', () => {
        const { fixture, el } = setup({ page: 1, pageSize: 20, matched: 30 });
        const emitted: number[] = [];
        fixture.componentInstance.pageSizeChange.subscribe((v) => emitted.push(v));
        const select = el.querySelector('select') as HTMLSelectElement;
        select.value = '100';
        select.dispatchEvent(new Event('change'));
        expect(emitted).toEqual([100]);
    });

    it('shows the select with a chevron', () => {
        const { el } = setup({ page: 1, pageSize: 20, matched: 30 });
        expect(el.querySelector('.control--select select')).not.toBeNull();
        expect(el.querySelector('.control--select use')?.getAttribute('href')).toBe('icons.svg#i-chevron-down');
    });

    it('offers a page box only when some pages have no link', () => {
        expect(setup({ page: 2, pageSize: 10, matched: 25 }).el.querySelector('.pagination__jump')).toBeNull();
        TestBed.resetTestingModule();
        const { el } = setup({ page: 1, pageSize: 20, matched: 2015 });
        const box = el.querySelector('.pagination__jump input') as HTMLInputElement;
        expect(box.getAttribute('aria-label')).toBe('Go to page (1–101)');
        expect(box.max).toBe('101');
    });

    describe('typing a page', () => {
        function typeIn(value: string, page = 1) {
            const { el } = setup({ page, pageSize: 20, matched: 2015 });
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
            const box = el.querySelector('.pagination__jump input') as HTMLInputElement;
            box.value = value;
            box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
            return { navigate, box };
        }

        it('goes to that page and clears the box', () => {
            const { navigate, box } = typeIn('57');
            expect(navigate).toHaveBeenCalledWith([], { queryParams: { page: 57 }, queryParamsHandling: 'merge' });
            expect(box.value).toBe('');
        });

        it('keeps the page within the pages there are', () => {
            expect(typeIn('500').navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { page: 101 } }));
            TestBed.resetTestingModule();
            expect(typeIn('0', 5).navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { page: null } }));
        });

        it('does nothing for an empty box or the current page', () => {
            expect(typeIn('').navigate).not.toHaveBeenCalled();
            TestBed.resetTestingModule();
            expect(typeIn('3', 3).navigate).not.toHaveBeenCalled();
        });
    });
});
