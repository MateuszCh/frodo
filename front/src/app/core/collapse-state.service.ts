import { DOCUMENT, Injectable, inject } from '@angular/core';

const STORAGE_KEY = 'frodo.expanded';
/** Beyond this the oldest keys go: renamed fields and removed types leave theirs behind. */
const MAX_KEYS = 300;

/**
 * The parts of the editors that collapse start collapsed: sections, field definitions, page
 * types, page components, repeater rows. This remembers in this browser (localStorage) the ones
 * the user left expanded. A key names a place in a schema or an editor, never a page or a post
 * ("rows:page-type:home/slides", "section:page/seo"), so all pages of a type share it and the
 * list grows with the schemas, not with the content. Collapsing a place again drops its key.
 *
 * The storage is read on every call, so tabs open side by side do not drop each other's keys;
 * the list in memory only stands in when the storage is unavailable.
 */
@Injectable({ providedIn: 'root' })
export class CollapseStateService {
    private readonly window = inject(DOCUMENT).defaultView;
    /** Oldest first. */
    private keys: string[] = [];

    isExpanded(key: string): boolean {
        return this.current().includes(key);
    }

    /** One key, or several at once with a single write (expand all, collapse all). */
    set(keys: string | readonly string[], expanded: boolean): void {
        const changed = new Set(typeof keys === 'string' ? [keys] : keys);
        if (!changed.size) {
            return;
        }
        const next = this.current().filter((k) => !changed.has(k));
        if (expanded) {
            next.push(...changed);
        }
        this.keys = next.slice(-MAX_KEYS);
        try {
            this.window?.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys));
        } catch {
            // storage unavailable (private mode): the state lasts for this page only
        }
    }

    private current(): string[] {
        this.keys = this.read() ?? this.keys;
        return this.keys;
    }

    /** The saved keys; null when the storage cannot be read. */
    private read(): string[] | null {
        let saved: string | null | undefined;
        try {
            saved = this.window?.localStorage.getItem(STORAGE_KEY);
        } catch {
            return null;
        }
        try {
            const keys = JSON.parse(saved ?? '[]');
            return Array.isArray(keys) ? keys.filter((key) => typeof key === 'string') : [];
        } catch {
            return [];
        }
    }
}
