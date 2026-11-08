import { provideHttpClient } from '@angular/common/http';
import { SessionState } from './core/auth/session-state';
import { testUser } from '../testing/auth';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Workspace routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter(routes)] });
    TestBed.inject(SessionState).authenticate(testUser);
  });

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

describe('Protected navigation integration', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter(routes)],
    }),
  );

  it('redirects signed-out direct links and browser revisits to login', async () => {
    TestBed.inject(SessionState).clear();
    const harness = await RouterTestingHarness.create('/repairs?filter=open');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Frepairs%3Ffilter%3Dopen');
    expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull();
    await harness.navigateByUrl('/customers');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fcustomers');
  });

  it('renders access denied for a customer without entering a redirect loop', async () => {
    TestBed.inject(SessionState).authenticate({ ...testUser, role: 'customer' });
    const harness = await RouterTestingHarness.create('/repairs');
    expect(TestBed.inject(Router).url).toBe('/access-denied');
    expect(harness.routeNativeElement?.textContent).toContain('does not have permission');
  });
});
