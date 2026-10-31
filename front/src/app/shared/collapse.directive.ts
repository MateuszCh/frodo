import {
    Directive,
    ElementRef,
    OnInit,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgForm } from '@angular/forms';
import { CollapseStateService } from '../core/collapse-state.service';

/**
 * Calls `reveal` with the host element when the form around it is submitted with an invalid
 * control inside the host. The editor then scrolls to the first invalid control, so a part
 * that hides controls must show that one first. Call it in an injection context.
 */
export function onFailedSave(reveal: (host: HTMLElement) => void): void {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    inject(NgForm, { optional: true })
        ?.ngSubmit.pipe(takeUntilDestroyed())
        .subscribe(() => {
            if (host.querySelector('.ng-invalid')) {
                reveal(host);
            }
        });
}

/**
 * A part of an editor that collapses: a section card, a field definition, a page component.
 * The template shows or hides the part's body by `collapsed()`; hidden, not removed, so its
 * controls stay in the form.
 *
 * A part starts collapsed, unless it is new (appCollapseOpen) or the user left it expanded
 * before under its key (CollapseStateService). The key is read once, at the start: one built
 * from a field id changes while the id is typed, and must not collapse the part then. An
 * expanded part takes its remembered state along to the new key, so a card drawn again after
 * a save (or a new field, once it has an id) is still expanded. A save that fails validation
 * expands a collapsed part with an invalid control, so the editor can scroll to it.
 */
@Directive({
    selector: '[appCollapse]',
    exportAs: 'appCollapse',
    host: { '[class.is-collapsed]': 'collapsed()' },
})
export class CollapseDirective implements OnInit {
    private readonly state = inject(CollapseStateService);
    /** Where an expanded part is remembered; empty: for as long as the view lives. */
    readonly key = input<string | null | undefined>(null, { alias: 'appCollapse' });
    /** Expanded at the start: something new to fill in. */
    readonly open = input(false, { alias: 'appCollapseOpen' });
    /** The user collapsed (true) or expanded the part; not emitted for a failed save. */
    readonly changed = output<boolean>({ alias: 'appCollapseChange' });

    readonly collapsed = signal(true);
    /** The key the state is remembered under, from ngOnInit on. */
    private currentKey: string | null | undefined;
    private started = false;

    constructor() {
        onFailedSave(() => this.collapsed.set(false));

        effect(() => {
            const key = this.key();
            if (!this.started || key === this.currentKey) {
                return;
            }
            untracked(() => {
                if (!this.collapsed()) {
                    if (this.currentKey) {
                        this.state.set(this.currentKey, false);
                    }
                    if (key) {
                        this.state.set(key, true);
                    }
                }
            });
            this.currentKey = key;
        });
    }

    ngOnInit(): void {
        const key = this.key();
        this.currentKey = key;
        this.started = true;
        this.collapsed.set(!this.open() && !(key && this.state.isExpanded(key)));
    }

    toggle(): void {
        this.set(!this.collapsed());
    }

    set(collapsed: boolean): void {
        this.collapsed.set(collapsed);
        const key = this.key();
        if (key) {
            this.state.set(key, !collapsed);
        }
        this.changed.emit(collapsed);
    }
}

/**
 * "Collapse all / Expand all" over the parts of a list (page components, field definitions):
 * whether all are collapsed, and one toggle that sets them all and remembers their keys with a
 * single write. It reports nothing through appCollapseChange; the list's owner remembers what
 * it needs after toggleAll(). Call it in an injection context.
 */
export function collapsibleList(parts: () => readonly CollapseDirective[]) {
    const state = inject(CollapseStateService);
    const allCollapsed = computed(() => {
        const list = parts();
        return list.length > 0 && list.every((part) => part.collapsed());
    });
    return {
        allCollapsed,
        toggleAll(): void {
            const collapsed = !allCollapsed();
            const list = parts();
            list.forEach((part) => part.collapsed.set(collapsed));
            const keys = list.map((part) => part.key()).filter((key): key is string => !!key);
            state.set(keys, !collapsed);
        },
    };
}
