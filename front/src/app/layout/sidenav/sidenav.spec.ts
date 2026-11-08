import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { SidenavComponent } from './sidenav';
import { makePost, makePostType } from '../../testing/test-helpers';

const KEY = 'frodo.nav.postsOpen';

describe('SidenavComponent posts group', () => {
    beforeEach(() => {
        localStorage.removeItem(KEY);
        TestBed.configureTestingModule({
            imports: [SidenavComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        });
    });

    afterEach(() => localStorage.removeItem(KEY));

    function render() {
        const fixture = TestBed.createComponent(SidenavComponent);
        fixture.detectChanges();
        TestBed.inject(HttpTestingController)
            .expectOne('/api/postType')
            .flush([
                makePostType({ _id: 'a', type: 'marker', pluralTitle: 'Markers', posts: [makePost(), makePost()] }),
                makePostType({ _id: 'b', type: 'icon', pluralTitle: 'Icons', posts: [] }),
            ]);
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;
        return {
            fixture,
            toggle: el.querySelector<HTMLButtonElement>('.nav__toggle')!,
            sub: el.querySelector<HTMLElement>('#nav-posts')!,
            counts: () => [...el.querySelectorAll('#nav-posts .nav__count')].map((c) => c.textContent?.trim()),
        };
    }

    it('starts collapsed, with the number of post types on the group', () => {
        const { toggle, sub } = render();
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(sub.hidden).toBe(true);
        expect(toggle.querySelector('.nav__count')?.textContent?.trim()).toBe('2 typy');
    });

    it('opens the group with the number of posts of each type and remembers it in localStorage', () => {
        const { fixture, toggle, sub, counts } = render();
        toggle.click();
        fixture.detectChanges();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(sub.hidden).toBe(false);
        expect(counts()).toEqual(['2', '0']);
        expect(localStorage.getItem(KEY)).toBe('1');
    });

    it('starts open when that was the last choice, and remembers collapsing it', () => {
        localStorage.setItem(KEY, '1');
        const { fixture, toggle, sub } = render();
        expect(sub.hidden).toBe(false);
        toggle.click();
        fixture.detectChanges();
        expect(sub.hidden).toBe(true);
        expect(localStorage.getItem(KEY)).toBe('0');
    });
});

describe('SidenavComponent analytics group', () => {
    const KEY_ANALYTICS = 'frodo.nav.analyticsOpen';

    @Component({ template: '' })
    class BlankComponent {}

    beforeEach(() => {
        localStorage.removeItem(KEY_ANALYTICS);
        TestBed.configureTestingModule({
            imports: [SidenavComponent],
            providers: [
                provideRouter([
                    { path: 'analytics/pages', component: BlankComponent, data: { family: 'analytics' } },
                    { path: '**', component: BlankComponent },
                ]),
                provideHttpClient(),
                provideHttpClientTesting(),
            ],
        });
    });

    afterEach(() => localStorage.removeItem(KEY_ANALYTICS));

    function render() {
        const fixture = TestBed.createComponent(SidenavComponent);
        fixture.detectChanges();
        TestBed.inject(HttpTestingController).expectOne('/api/postType').flush([]);
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;
        return {
            fixture,
            toggle: el.querySelector<HTMLButtonElement>('[aria-controls="nav-analytics"]')!,
            sub: el.querySelector<HTMLElement>('#nav-analytics')!,
            links: () =>
                [...el.querySelectorAll<HTMLAnchorElement>('#nav-analytics a')].map((a) => [
                    a.textContent?.trim(),
                    a.getAttribute('href'),
                    a.getAttribute('aria-current'),
                ]),
        };
    }

    it('groups the subpages of Analytics under Reports, collapsed at first', () => {
        const { toggle, sub, links } = render();
        expect(toggle.textContent?.trim()).toBe('Analityka');
        expect(toggle.previousElementSibling?.textContent?.trim()).toBe('Raporty');
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(sub.hidden).toBe(true);
        expect(links()).toEqual([
            ['Przegląd', '/analytics', null],
            ['Strony', '/analytics/pages', null],
            ['Odwiedzający', '/analytics/visitors', null],
        ]);
    });

    it('remembers opening the group', () => {
        const { fixture, toggle, sub } = render();
        toggle.click();
        fixture.detectChanges();
        expect(sub.hidden).toBe(false);
        expect(localStorage.getItem(KEY_ANALYTICS)).toBe('1');
    });

    it('opens the group on a subpage and marks it', async () => {
        const { fixture, sub, links } = render();
        await TestBed.inject(Router).navigateByUrl('/analytics/pages?from=2026-11-01&to=2026-11-03');
        fixture.detectChanges();
        expect(sub.hidden).toBe(false);
        expect(links().map((l) => l[2])).toEqual([null, 'page', null]);
        // opened for this visit only
        expect(localStorage.getItem(KEY_ANALYTICS)).toBeNull();
    });
});
