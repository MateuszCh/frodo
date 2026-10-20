import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePl from '@angular/common/locales/pl';
import { FieldType } from '../../models/models';
import { Message, MessageKey, Plural, en, pl } from './messages';

// DatePipe needs the locale data; en-US ships with Angular
registerLocaleData(localePl);

export type Lang = 'pl' | 'en';
export type MessageParams = Record<string, string | number>;

const STORAGE_KEY = 'frodo.lang';
const MESSAGES: Record<Lang, Record<MessageKey, Message>> = { pl, en };
const LOCALES: Record<Lang, string> = { pl: 'pl', en: 'en-US' };
const PLURALS: Record<Lang, Intl.PluralRules> = {
    pl: new Intl.PluralRules('pl'),
    en: new Intl.PluralRules('en-US'),
};

/**
 * Polish / English interface. The choice is remembered (index.html applies it to
 * <html lang> before Angular starts); without a choice the interface is Polish.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
    private document = inject(DOCUMENT);
    private window = this.document.defaultView;

    readonly lang = signal<Lang>(this.read() ?? 'pl');
    /** Locale for DatePipe and the date adapter. */
    readonly locale = computed(() => LOCALES[this.lang()]);

    /** Text for the current language; read in a template, it re-renders on a switch. */
    readonly t = (key: MessageKey, params?: MessageParams): string => {
        const lang = this.lang();
        const message = MESSAGES[lang][key];
        if (message === undefined) {
            // a key built at runtime that has no text (e.g. before the route sets the family)
            return key;
        }
        const text =
            typeof message === 'string'
                ? message
                : this.pluralForm(message, PLURALS[lang].select(Number(params?.['count'] ?? 0)));
        return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : text;
    };

    /** Name of a field type in the post type editor. */
    readonly fieldType = (type: FieldType): string => this.t(`fieldType.${type}`);

    constructor() {
        this.document.documentElement.lang = this.lang();
    }

    set(lang: Lang): void {
        this.lang.set(lang);
        this.document.documentElement.lang = lang;
        try {
            this.window?.localStorage.setItem(STORAGE_KEY, lang);
        } catch {
            // storage unavailable (private mode): the choice lasts for this page only
        }
    }

    private pluralForm(message: Plural, category: Intl.LDMLPluralRule): string {
        return message[category as keyof Plural] ?? message.other;
    }

    private read(): Lang | null {
        try {
            const saved = this.window?.localStorage.getItem(STORAGE_KEY);
            return saved === 'pl' || saved === 'en' ? saved : null;
        } catch {
            return null;
        }
    }
}
