import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App navigation', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes)] }),
  );

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
});
