import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { MessageDialogComponent } from './message-dialog';
import type { MessageDialogData } from './message-dialog';

function setup(data: MessageDialogData) {
    TestBed.configureTestingModule({
        imports: [MessageDialogComponent, MatIconTestingModule],
        providers: [
            provideNoopAnimations(),
            { provide: MAT_DIALOG_DATA, useValue: data },
            { provide: MatDialogRef, useValue: { close: vi.fn() } },
        ],
    });
    const fixture = TestBed.createComponent(MessageDialogComponent);
    fixture.detectChanges();
    return fixture;
}

describe('MessageDialogComponent', () => {
    it('exposes the injected data on the component', () => {
        const fixture = setup({ message: 'Are you sure?', confirm: true });
        expect(fixture.componentInstance.data.message).toBe('Are you sure?');
        expect(fixture.componentInstance.data.confirm).toBe(true);
    });

    it('renders the message in the template', () => {
        const fixture = setup({ message: 'Hello world', confirm: false });
        const content = fixture.nativeElement.querySelector('mat-dialog-content');
        expect(content?.textContent?.trim()).toBe('Hello world');
    });

    it('renders an optional title when provided', () => {
        const fixture = setup({ message: 'Msg', title: 'Confirm action', confirm: false });
        const title = fixture.nativeElement.querySelector('[mat-dialog-title]');
        expect(title?.textContent?.trim()).toBe('Confirm action');
    });

    it('does not render a title element when title is omitted', () => {
        const fixture = setup({ message: 'No title here', confirm: false });
        const title = fixture.nativeElement.querySelector('[mat-dialog-title]');
        expect(title).toBeNull();
    });

    it('renders Yes/No buttons in confirm mode', () => {
        const fixture = setup({ message: 'Delete?', confirm: true });
        const buttons: NodeListOf<HTMLButtonElement> =
            fixture.nativeElement.querySelectorAll('mat-dialog-actions button');
        const texts = Array.from(buttons).map((b) => b.textContent?.trim());
        expect(texts).toContain('No');
        expect(texts).toContain('Yes');
    });

    it('renders only an Ok button in alert mode', () => {
        const fixture = setup({ message: 'Done!', confirm: false });
        const buttons: NodeListOf<HTMLButtonElement> =
            fixture.nativeElement.querySelectorAll('mat-dialog-actions button');
        expect(buttons).toHaveLength(1);
        expect(buttons[0].textContent?.trim()).toBe('Ok');
    });
});
