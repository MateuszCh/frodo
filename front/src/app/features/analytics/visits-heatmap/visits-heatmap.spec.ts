import { TestBed } from '@angular/core/testing';
import { VisitsHeatmapComponent } from './visits-heatmap';
import type { VisitHour } from '../../../models/models';

beforeEach(() => localStorage.setItem('frodo.lang', 'en'));
afterEach(() => localStorage.removeItem('frodo.lang'));

async function render(hours: VisitHour[]) {
    TestBed.configureTestingModule({ imports: [VisitsHeatmapComponent] });
    const fixture = TestBed.createComponent(VisitsHeatmapComponent);
    fixture.componentRef.setInput('hours', hours);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
}

describe('VisitsHeatmapComponent', () => {
    it('is a table of the weekdays from Monday by the 24 hours', async () => {
        const root = await render([]);
        expect([...root.querySelectorAll('.heatmap__day')].map((th) => th.textContent)).toEqual([
            'Mon',
            'Tue',
            'Wed',
            'Thu',
            'Fri',
            'Sat',
            'Sun',
        ]);
        expect(root.querySelectorAll('.heatmap__hour').length).toBe(24);
        expect(root.querySelectorAll('.heatmap__cell').length).toBe(7 * 24);
        expect(root.querySelectorAll('.heatmap__cell--empty').length).toBe(7 * 24);
        expect(root.querySelector('.heatmap__peak')).toBeNull();
    });

    it('shades each hour by its share of the busiest one and names the busiest', async () => {
        const root = await render([
            { weekday: 6, hour: 18, count: 4 },
            { weekday: 1, hour: 9, count: 1 },
        ]);
        const cell = (weekday: number, hour: number) =>
            root.querySelectorAll('tbody tr')[weekday - 1].querySelectorAll<HTMLElement>('.heatmap__cell')[hour];
        expect(cell(6, 18).style.getPropertyValue('--level')).toBe('100%');
        expect(cell(1, 9).style.getPropertyValue('--level')).toBe('25%');
        expect(cell(6, 18).textContent?.trim()).toBe('4');
        expect(root.querySelector('.heatmap__peak')?.textContent).toBe('Busiest: Saturday, 18:00–19:00: 4 views');
    });

    it('shows the hour, views and share of a hovered cell above it', async () => {
        TestBed.configureTestingModule({ imports: [VisitsHeatmapComponent] });
        const fixture = TestBed.createComponent(VisitsHeatmapComponent);
        fixture.componentRef.setInput('hours', [
            { weekday: 6, hour: 18, count: 3 },
            { weekday: 1, hour: 9, count: 1 },
        ]);
        fixture.detectChanges();
        await fixture.whenStable();
        const root = fixture.nativeElement as HTMLElement;
        const cell = root.querySelectorAll('tbody tr')[5].querySelectorAll<HTMLElement>('.heatmap__cell')[18];
        expect(root.querySelector('.heatmap__tip')).toBeNull();

        cell.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();
        const tip = root.querySelector<HTMLElement>('.heatmap__tip')!;
        expect(tip.querySelector('.chart-tip__day')?.textContent).toBe('Saturday, 18:00–19:00');
        expect([...tip.querySelectorAll('.chart-tip__value')].map((v) => v.textContent)).toEqual(['3', '75.0%']);
        expect(cell.classList).toContain('heatmap__cell--active');
        expect(root.querySelectorAll('.heatmap__cell--active').length).toBe(1);
        expect(root.querySelector('.heatmap__day--active')?.textContent).toBe('Sat');

        root.querySelector('.heatmap')!.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();
        expect(root.querySelector('.heatmap__tip')).toBeNull();
        expect(root.querySelector('.heatmap__cell--active')).toBeNull();
    });
});
