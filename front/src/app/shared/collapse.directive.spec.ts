import { Component, signal, viewChildren } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { CollapseDirective, collapsibleList } from './collapse.directive';
import { CollapseStateService } from '../core/collapse-state.service';

@Component({
    imports: [FormsModule, CollapseDirective],
    template: `
        <form (ngSubmit)="submitted = true">
            <section
                [appCollapse]="key()"
                [appCollapseOpen]="open()"
                (appCollapseChange)="changes.push($event)"
                #part="appCollapse"
            >
                <div class="body" [hidden]="part.collapsed()">
                    <input name="title" [required]="required()" [(ngModel)]="title" />
                </div>
            </section>
            <button type="submit">Save</button>
        </form>
    `,
})
class HostComponent {
    readonly key = signal<string | null>('section:test');
    readonly open = signal(false);
    readonly required = signal(false);
    title = '';
    submitted = false;
    changes: boolean[] = [];
}

describe('CollapseDirective', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let state: { isExpanded: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        state = { isExpanded: vi.fn(() => false), set: vi.fn() };
        TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [{ provide: CollapseStateService, useValue: state }],
        });
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
    });

    function directive(): CollapseDirective {
        return fixture.debugElement
            .query(By.directive(CollapseDirective))
            .injector.get(CollapseDirective);
    }

    function section(): HTMLElement {
        return fixture.nativeElement.querySelector('section');
    }

    function body(): HTMLElement {
        return fixture.nativeElement.querySelector('.body');
    }

    it('starts collapsed when nothing is remembered', () => {
        fixture.detectChanges();

        expect(state.isExpanded).toHaveBeenCalledWith('section:test');
        expect(body().hidden).toBe(true);
        expect(section().classList).toContain('is-collapsed');
    });

    it('starts expanded when it was left expanded under its key', () => {
        state.isExpanded.mockReturnValue(true);
        fixture.detectChanges();

        expect(body().hidden).toBe(false);
        expect(section().classList).not.toContain('is-collapsed');
    });

    it('starts expanded with appCollapseOpen, whatever is remembered', () => {
        host.open.set(true);
        fixture.detectChanges();

        expect(body().hidden).toBe(false);
    });

    it('starts collapsed without a key', () => {
        host.key.set(null);
        fixture.detectChanges();

        expect(body().hidden).toBe(true);
        expect(state.isExpanded).not.toHaveBeenCalled();
    });

    it('reads the key once: a key that changes later does not expand the part', () => {
        fixture.detectChanges();
        state.isExpanded.mockReturnValue(true);
        host.key.set('section:other');
        fixture.detectChanges();

        expect(body().hidden).toBe(true);
    });

    it('remembers what the user does under the current key and reports it', () => {
        fixture.detectChanges();
        host.key.set('section:renamed');
        fixture.detectChanges();

        directive().toggle();
        fixture.detectChanges();

        expect(body().hidden).toBe(false);
        expect(state.set).toHaveBeenCalledWith('section:renamed', true);
        expect(host.changes).toEqual([false]);

        directive().set(true);
        expect(state.set).toHaveBeenLastCalledWith('section:renamed', false);
        expect(host.changes).toEqual([false, true]);
    });

    it('does not remember without a key', () => {
        host.key.set(null);
        fixture.detectChanges();

        directive().toggle();

        expect(directive().collapsed()).toBe(false);
        expect(state.set).not.toHaveBeenCalled();
    });

    it('expands on a save with an invalid control inside, without remembering it', async () => {
        host.required.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        // the control registers a tick later; this check marks it invalid
        fixture.detectChanges();

        fixture.nativeElement.querySelector('button').click();
        fixture.detectChanges();

        expect(host.submitted).toBe(true);
        expect(body().hidden).toBe(false);
        expect(state.set).not.toHaveBeenCalled();
        expect(host.changes).toEqual([]);
    });

    it('takes the remembered state of an expanded part along to a new key', () => {
        state.isExpanded.mockReturnValue(true);
        fixture.detectChanges();

        host.key.set('section:renamed');
        fixture.detectChanges();

        expect(state.set.mock.calls).toEqual([
            ['section:test', false],
            ['section:renamed', true],
        ]);
    });

    it('remembers a new part once it gets a key, while it is expanded', () => {
        host.key.set(null);
        host.open.set(true);
        fixture.detectChanges();

        host.key.set('def:post-type:marker/gallery');
        fixture.detectChanges();

        expect(state.set.mock.calls).toEqual([['def:post-type:marker/gallery', true]]);
    });

    it('remembers nothing when the key of a collapsed part changes', () => {
        fixture.detectChanges();

        host.key.set('section:renamed');
        fixture.detectChanges();

        expect(state.set).not.toHaveBeenCalled();
    });

    it('stays collapsed on a save when its controls are valid', async () => {
        fixture.detectChanges();
        await fixture.whenStable();

        fixture.nativeElement.querySelector('button').click();
        fixture.detectChanges();

        expect(body().hidden).toBe(true);
    });
});

@Component({
    imports: [CollapseDirective],
    template: `
        @for (key of keys; track $index) {
            <section [appCollapse]="key" (appCollapseChange)="changes.push($event)"></section>
        }
    `,
})
class ListHostComponent {
    keys: (string | null)[] = ['def:a', 'def:b', null];
    changes: boolean[] = [];
    readonly parts = viewChildren(CollapseDirective);
    readonly list = collapsibleList(() => this.parts());
}

describe('collapsibleList', () => {
    it('collapses and expands all parts, remembering their keys with one write', () => {
        const state = { isExpanded: vi.fn(() => false), set: vi.fn() };
        TestBed.configureTestingModule({
            imports: [ListHostComponent],
            providers: [{ provide: CollapseStateService, useValue: state }],
        });
        const fixture = TestBed.createComponent(ListHostComponent);
        fixture.detectChanges();
        const host = fixture.componentInstance;

        expect(host.list.allCollapsed()).toBe(true);

        host.list.toggleAll();

        expect(host.parts().map((part) => part.collapsed())).toEqual([false, false, false]);
        expect(host.list.allCollapsed()).toBe(false);
        expect(state.set.mock.calls).toEqual([[['def:a', 'def:b'], true]]);
        // the owner of the list remembers what it needs itself
        expect(host.changes).toEqual([]);

        host.list.toggleAll();

        expect(host.list.allCollapsed()).toBe(true);
        expect(state.set).toHaveBeenLastCalledWith(['def:a', 'def:b'], false);
    });
});
