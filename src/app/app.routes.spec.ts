import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Workspace routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('redirects the root to the dashboard', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Your workshop, in harmony.');
  });

  for (const [path, heading] of [
    ['customers', 'Customers'],
    ['instruments', 'Instruments'],
    ['repairs', 'Repairs'],
    ['missing/deep/path', 'A little off-key.'],
  ]) {
    it(`renders /${path}`, async () => {
      const harness = await RouterTestingHarness.create(`/${path}`);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(heading);
    });
  }
});
