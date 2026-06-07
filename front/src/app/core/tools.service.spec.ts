import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ToolsService } from './tools.service';
import { MessageDialogComponent } from './dialogs/message-dialog/message-dialog';

function makeDialogMock(closeWith: boolean | undefined = true) {
    const afterClosed = vi.fn().mockReturnValue(of(closeWith));
    const ref = { afterClosed };
    const dialog = { open: vi.fn().mockReturnValue(ref) };
    return { dialog, ref };
}

describe('ToolsService', () => {
    let service: ToolsService;
    let dialogMock: ReturnType<typeof makeDialogMock>['dialog'];

    beforeEach(() => {
        ({ dialog: dialogMock } = makeDialogMock());
        TestBed.configureTestingModule({
            providers: [ToolsService, { provide: MatDialog, useValue: dialogMock }],
        });
        service = TestBed.inject(ToolsService);
    });

    // ---- alert ---------------------------------------------------------------

    describe('alert()', () => {
        it('opens a dialog with confirm: false', () => {
            service.alert('Something happened');
            expect(dialogMock.open).toHaveBeenCalledWith(
                MessageDialogComponent,
                expect.objectContaining({ data: expect.objectContaining({ confirm: false, message: 'Something happened' }) }),
            );
        });

        it('passes the title through', () => {
            service.alert('msg', 'My Title');
            expect(dialogMock.open).toHaveBeenCalledWith(
                MessageDialogComponent,
                expect.objectContaining({ data: expect.objectContaining({ title: 'My Title' }) }),
            );
        });

        it('passes title as undefined when not provided', () => {
            service.alert('msg');
            expect(dialogMock.open).toHaveBeenCalledWith(
                MessageDialogComponent,
                expect.objectContaining({ data: expect.objectContaining({ title: undefined }) }),
            );
        });
    });

    // ---- confirm -------------------------------------------------------------

    describe('confirm()', () => {
        it('opens a dialog with confirm: true', () => {
            service.confirm('Delete?').subscribe();
            expect(dialogMock.open).toHaveBeenCalledWith(
                MessageDialogComponent,
                expect.objectContaining({ data: expect.objectContaining({ confirm: true, message: 'Delete?' }) }),
            );
        });

        it('emits true when the user confirms', () => {
            let result: boolean | undefined;
            service.confirm('Sure?').subscribe((v) => (result = v));
            expect(result).toBe(true);
        });

        it('emits false when the user cancels', () => {
            dialogMock.open.mockReturnValue({ afterClosed: vi.fn().mockReturnValue(of(false)) });
            let result: boolean | undefined;
            service.confirm('Sure?').subscribe((v) => (result = v));
            expect(result).toBe(false);
        });
    });

    // ---- scrollToError -------------------------------------------------------

    describe('scrollToError()', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => {
            vi.useRealTimers();
            document.body.innerHTML = '';
        });

        it('calls scrollIntoView on the first invalid element', () => {
            const el = document.createElement('div');
            el.className = 'ng-invalid';
            const scrollSpy = vi.fn();
            el.scrollIntoView = scrollSpy;
            document.body.appendChild(el);

            service.scrollToError('body');
            vi.runAllTimers();

            expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
        });

        it('does not throw when no invalid element exists', () => {
            expect(() => {
                service.scrollToError('body');
                vi.runAllTimers();
            }).not.toThrow();
        });
    });

    // ---- debounce ------------------------------------------------------------

    describe('debounce()', () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        it('calls the function once after rapid repeated calls', () => {
            const fn = vi.fn();
            const debounced = service.debounce(fn, 100);
            debounced();
            debounced();
            debounced();
            expect(fn).not.toHaveBeenCalled();
            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('resets the timer on each call', () => {
            const fn = vi.fn();
            const debounced = service.debounce(fn, 100);
            debounced();
            vi.advanceTimersByTime(50);
            debounced(); // reset
            vi.advanceTimersByTime(50);
            expect(fn).not.toHaveBeenCalled();
            vi.advanceTimersByTime(50);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('calls the function immediately after the wait has elapsed', () => {
            const fn = vi.fn();
            const debounced = service.debounce(fn, 200);
            debounced();
            vi.advanceTimersByTime(200);
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });
});
