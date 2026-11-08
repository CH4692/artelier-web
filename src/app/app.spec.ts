import { provideHttpClient } from '@angular/common/http';
import { SessionState } from './core/auth/session-state';
import { testUser } from '../testing/auth';
import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';

describe('App navigation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter(routes), provideLocationMocks()],
    });
    TestBed.inject(SessionState).authenticate(testUser);
  });

  it('exposes the four workspaces and toggles the mobile navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect([...element.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual([
      '◫Dashboard',
      '◎Customers',
      '♮Instruments',
      '◇Repairs',
    ]);
    const toggle = element.querySelector<HTMLButtonElement>('.menu-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    element.querySelector<HTMLAnchorElement>('nav a')!.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
  it('updates titles and active links across navigation and browser history', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    const element: HTMLElement = fixture.nativeElement;
    router.initialNavigation();
    await fixture.whenStable();
    await router.navigateByUrl('/dashboard');
    await fixture.whenStable();
    await router.navigateByUrl('/customers');
    await fixture.whenStable();
    expect(element.querySelector('.current-page')?.textContent).toBe('Customers');
    expect(element.querySelector('nav a[aria-current="page"]')?.getAttribute('href')).toBe(
      '/customers',
    );
    const back = firstValueFrom(
      router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    );
    location.back();
    await back;
    await fixture.whenStable();
    expect(element.querySelector('.current-page')?.textContent).toBe('Dashboard');
    const forward = firstValueFrom(
      router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    );
    location.forward();
    await forward;
    await fixture.whenStable();
    expect(element.querySelector('.current-page')?.textContent).toBe('Customers');
    await router.navigateByUrl('/unknown');
    await fixture.whenStable();
    expect(element.querySelector('.current-page')?.textContent).toBe('Page not found');
    expect(element.querySelector('nav a[aria-current="page"]')).toBeNull();
  });

  it('closes the menu with Escape and returns focus to its keyboard control', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.menu-toggle')!;
    toggle.style.display = 'block';
    toggle.click();
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    element
      .querySelector('nav a')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    expect(toggle.getAttribute('aria-controls')).toBe(element.querySelector('nav')!.id);
  });
});
