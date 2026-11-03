import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
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
