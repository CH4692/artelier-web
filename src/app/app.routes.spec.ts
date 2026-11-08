import { RepairsService } from './features/repairs/repairs.service';
import { InstrumentsService } from './features/instruments/instruments.service';
import { CustomersService } from './features/customers/customers.service';
import { of } from 'rxjs';
import { DashboardService } from './features/dashboard/dashboard.service';
import { provideHttpClient } from '@angular/common/http';
import { SessionState } from './core/auth/session-state';
import { testUser } from '../testing/auth';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Workspace routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: RepairsService, useValue: { list: () => of({ repairs: [], total: 0 }) } },
        {
          provide: InstrumentsService,
          useValue: { list: () => of({ instruments: [], total: 0 }) },
        },
        { provide: CustomersService, useValue: { list: () => of({ customers: [], total: 0 }) } },
        {
          provide: DashboardService,
          useValue: {
            pickup: () => of({ entries: [], total: 0, relationsPending: false }),
            readyForPickupCount: () => of({ status: 'unavailable' }),
          },
        },
        provideHttpClient(),
        provideRouter(routes),
      ],
    });
    TestBed.inject(SessionState).authenticate(testUser);
  });

  it('redirects the root to the dashboard', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(harness.routeNativeElement?.textContent).toContain('Werkstattübersicht');
  });

  for (const [path, heading] of [
    ['customers', 'Kunden'],
    ['instruments', 'Instrumente'],
    ['repairs', 'Reparaturen'],
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
      providers: [
        { provide: RepairsService, useValue: { list: () => of({ repairs: [], total: 0 }) } },
        {
          provide: InstrumentsService,
          useValue: { list: () => of({ instruments: [], total: 0 }) },
        },
        { provide: CustomersService, useValue: { list: () => of({ customers: [], total: 0 }) } },
        {
          provide: DashboardService,
          useValue: {
            pickup: () => of({ entries: [], total: 0, relationsPending: false }),
            readyForPickupCount: () => of({ status: 'unavailable' }),
          },
        },
        provideHttpClient(),
        provideRouter(routes),
      ],
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
  it('protects dashboard data from signed-out and customer users', async () => {
    TestBed.inject(SessionState).clear();
    const harness = await RouterTestingHarness.create('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fdashboard');
    TestBed.inject(SessionState).authenticate({ ...testUser, role: 'customer' });
    await harness.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/access-denied');
  });
});
