import { TestBed } from '@angular/core/testing';
import { DonutSlice, VisitsDonutComponent } from './visits-donut';

beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

const SLICES: DonutSlice[] = [
    { key: 'a', label: 'Direct', count: 3, series: 'series-slot-1' },
    { key: 'b', label: 'google.com', count: 1, series: 'series-slot-2' },
];

async function render(slices: DonutSlice[] = SLICES) {
    TestBed.configureTestingModule({ imports: [VisitsDonutComponent] });
    const fixture = TestBed.createComponent(VisitsDonutComponent);
    fixture.componentRef.setInput('slices', slices);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const settle = async () => {
        fixture.detectChanges();
        await fixture.whenStable();
    };
    return { fixture, root, settle };
}

describe('VisitsDonutComponent', () => {
    it('draws an arc per slice with the total in the middle', async () => {
        const { root } = await render();
        const segments = [...root.querySelectorAll('.donut__segment')];
        expect(segments.map((s) => s.getAttribute('class'))).toEqual([
            'donut__segment series-slot-1',
            'donut__segment series-slot-2',
        ]);
        const ring = 2 * Math.PI * 40;
        expect(parseFloat(segments[0].getAttribute('stroke-dasharray')!)).toBeCloseTo(ring * 0.75 - 2);
        expect(parseFloat(segments[1].getAttribute('stroke-dashoffset')!)).toBeCloseTo(-ring * 0.75);
        expect(root.querySelectorAll('.donut__hit').length).toBe(2);
        expect(root.querySelector('.donut__value')?.textContent).toBe('4');
        expect(root.querySelector('.donut__label')?.textContent).toBe('visits');
        expect(root.querySelector('.donut__tip')).toBeNull();
    });

    it('shows the count and share of the hovered arc and dims the others', async () => {
        const { fixture, root, settle } = await render();
        root.querySelectorAll('.donut__hit')[1].dispatchEvent(new MouseEvent('mouseenter'));
        await settle();
        expect(fixture.componentInstance.hovered()).toBe('b');
        const tip = root.querySelector<HTMLElement>('.donut__tip')!;
        expect(tip.querySelector('.donut__tip-name')?.textContent?.trim()).toBe('google.com');
        expect(tip.querySelector('.donut__tip-name')?.classList).toContain('series-slot-2');
        expect([...tip.querySelectorAll('.chart-tip__value')].map((v) => v.textContent)).toEqual(['1', '25.0%']);
        // the quarter from 9 to 12 o'clock: its middle is upper left, the tip above it
        expect(tip.classList).toContain('donut__tip--above');
        expect(parseFloat(tip.style.left)).toBeLessThan(50);
        const segments = root.querySelectorAll('.donut__segment');
        expect(segments[0].classList).toContain('donut__segment--dim');
        expect(segments[1].classList).not.toContain('donut__segment--dim');

        root.querySelector('.donut__svg')!.dispatchEvent(new MouseEvent('mouseleave'));
        await settle();
        expect(root.querySelector('.donut__tip')).toBeNull();
        expect(root.querySelectorAll('.donut__segment--dim').length).toBe(0);
    });

    it('puts the tip below an arc in the lower half', async () => {
        const { fixture, root, settle } = await render();
        fixture.componentRef.setInput('hovered', 'a');
        await settle();
        // three quarters from 12 o'clock: the middle is at half past four
        const tip = root.querySelector<HTMLElement>('.donut__tip')!;
        expect(tip.classList).toContain('donut__tip--below');
        expect(parseFloat(tip.style.left)).toBeGreaterThan(50);
    });

    it('draws a single slice as a whole ring without a gap', async () => {
        const { root } = await render([SLICES[0]]);
        const ring = 2 * Math.PI * 40;
        expect(parseFloat(root.querySelector('.donut__segment')!.getAttribute('stroke-dasharray')!)).toBeCloseTo(ring);
    });
});
