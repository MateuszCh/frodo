import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'frodo.theme';

/**
 * Light / Dark switch. The choice is remembered and set as data-theme on <html>
 * (index.html applies it again before Angular starts). Until something is chosen
 * the system setting decides, through prefers-color-scheme in the tokens.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private document = inject(DOCUMENT);
    private window = this.document.defaultView;

    readonly theme = signal<Theme>(this.read() ?? this.system());

    constructor() {
        // keep the switch in step with the system while nothing is chosen
        this.window
            ?.matchMedia?.('(prefers-color-scheme: dark)')
            .addEventListener?.('change', (e) => {
                if (!this.read()) {
                    this.theme.set(e.matches ? 'dark' : 'light');
                }
            });
    }

    set(theme: Theme): void {
        this.theme.set(theme);
        this.document.documentElement.dataset['theme'] = theme;
        try {
            this.window?.localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            // storage unavailable (private mode): the choice lasts for this page only
        }
    }

    private read(): Theme | null {
        try {
            const saved = this.window?.localStorage.getItem(STORAGE_KEY);
            return saved === 'light' || saved === 'dark' ? saved : null;
        } catch {
            return null;
        }
    }

    private system(): Theme {
        return this.window?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
}
