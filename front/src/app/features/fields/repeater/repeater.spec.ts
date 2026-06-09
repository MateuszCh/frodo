import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { FilesService } from '../../../core/files.service';
import { Field } from '../../../models/models';
import { RepeaterComponent } from './repeater';

@Component({
    // app-field's ngModel controls resolve their ControlContainer from the
    // ancestor NgForm, mirroring how the post editor hosts the repeater
    template: `
        <form>
            <app-repeater [parentModel]="model" [field]="field"></app-repeater>
        </form>
    `,
    imports: [FormsModule, RepeaterComponent],
})
class HostComponent {
    field: Field = {
        id: 'items',
        title: 'Items',
        type: 'repeater',
        repeaterFields: [{ id: 'name', title: 'Name', type: 'text' }],
    };
    model: Record<string, unknown> = { items: [{ name: 'first' }] };
}

describe('RepeaterComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [
                provideNoopAnimations(),
                { provide: FilesService, useValue: { catalogues: () => [] } },
                { provide: MatDialog, useValue: { open: vi.fn() } },
            ],
        });
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
    });

    function rowInputs(): HTMLInputElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll('.repeater-row input'));
    }

    function buttonByText(text: string): HTMLButtonElement {
        const buttons: HTMLButtonElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('button'),
        );
        return buttons.find((b) => b.textContent?.trim() === text)!;
    }

    it('renders one row per existing entry with inputs bound to row values', async () => {
        host.model = { items: [{ name: 'first' }, { name: 'second' }] };
        fixture.detectChanges();
        await fixture.whenStable();

        const inputs = rowInputs();
        expect(inputs.length).toBe(2);
        expect(inputs[0].value).toBe('first');
        expect(inputs[1].value).toBe('second');
    });

    it('creates the array under field.id when the parent model has none', () => {
        host.model = {};
        fixture.detectChanges();

        expect(Array.isArray(host.model['items'])).toBe(true);
        expect(rowInputs().length).toBe(0);
    });

    it('drops row keys that are not part of the repeater schema (checkModel)', () => {
        host.model = { items: [{ name: 'a', stale: 'x' }] };
        fixture.detectChanges();

        expect(host.model['items']).toEqual([{ name: 'a' }]);
    });

    it('addRow appends an empty row to the parent array', () => {
        fixture.detectChanges();

        buttonByText('Add new row').click();
        fixture.detectChanges();

        expect(host.model['items']).toEqual([{ name: 'first' }, {}]);
        expect(rowInputs().length).toBe(2);
    });

    it('removeRow removes the row from the parent array', () => {
        fixture.detectChanges();

        buttonByText('Delete row').click();
        fixture.detectChanges();

        expect(host.model['items']).toEqual([]);
        expect(rowInputs().length).toBe(0);
    });

    it('re-syncs rows when the parent model object is replaced (post editor swaps in the save response)', async () => {
        const original = { items: [{ name: 'original' }] };
        host.model = original;
        fixture.detectChanges();
        await fixture.whenStable();

        // simulate PostComponent.save(): model.set(response) hands the repeater
        // a brand new object — rows must re-bind to it
        const response = { items: [{ name: 'from-server' }] };
        host.model = response;
        fixture.detectChanges();
        await fixture.whenStable();

        const input = rowInputs()[0];
        expect(input.value).toBe('from-server');

        // edits after the swap must land in the new object, not the detached one
        input.value = 'edited-after-save';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(response.items).toEqual([{ name: 'edited-after-save' }]);
        expect(original.items).toEqual([{ name: 'original' }]);
    });
});
