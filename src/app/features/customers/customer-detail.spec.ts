import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { SessionState } from '../../core/auth/session-state';
import { safeReturnUrl } from '../../core/auth/return-url';
import { testUser } from '../../../testing/auth';
import { testCustomer, testOverview } from '../../../testing/customers';
import { CustomerDetail } from './customer-detail';

describe('Customer detail and route permissions', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionState).authenticate(testUser);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('shows a dedicated detail page with contacts, instruments and existing edit navigation', async () => {
    const harness = await RouterTestingHarness.create('/customers/12');
    http.expectOne('/api/v1/customers/12/overview?include_archived=true').flush(testOverview);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Maria Beispiel');
    expect(harness.routeNativeElement?.textContent).toContain('TEST-8');
    expect(harness.routeNativeElement?.textContent).toContain('Testwerkstatt');
    expect(harness.routeNativeElement?.querySelector('a.button')?.getAttribute('href')).toBe(
      '/customers/12/edit',
    );
  });

  it('identifies archived customers and archived instruments and does not offer archiving twice', async () => {
    const harness = await RouterTestingHarness.create('/customers/12');
    http.expectOne('/api/v1/customers/12/overview?include_archived=true').flush({
      customer: { ...testCustomer, is_archived: true },
      instruments: [{ ...testOverview.instruments[0], is_archived: true }],
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Archiviert');
    expect(harness.routeNativeElement?.querySelector('app-archive-customer')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('a.button')).not.toBeNull();
  });

  it('shows unknown IDs and 404 responses as not found', async () => {
    const harness = await RouterTestingHarness.create('/customers/missing');
    expect(harness.routeNativeElement?.textContent).toContain('Kunde nicht gefunden');
    http.expectNone((r) => r.url.includes('overview'));
    await harness.navigateByUrl('/customers/999');
    http
      .expectOne('/api/v1/customers/999/overview?include_archived=true')
      .flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Kunde nicht gefunden');
  });

  it('handles overview failures with safe retry and an accurate no-instruments result', async () => {
    const harness = await RouterTestingHarness.create('/customers/12');
    http
      .expectOne('/api/v1/customers/12/overview?include_archived=true')
      .flush({ detail: 'private' }, { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('private');
    (harness.routeDebugElement!.componentInstance as CustomerDetail).retry();
    http
      .expectOne('/api/v1/customers/12/overview?include_archived=true')
      .flush({ customer: testCustomer, instruments: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('keine Instrumente');
  });

  it('changes archive presentation only after the confirmed mutation and reloads the active list', async () => {
    const harness = await RouterTestingHarness.create('/customers/12');
    http.expectOne('/api/v1/customers/12/overview?include_archived=true').flush(testOverview);
    harness.detectChanges();
    (harness.routeDebugElement!.componentInstance as CustomerDetail).archived({
      ...testCustomer,
      is_archived: true,
    });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Die Daten bleiben erhalten');
    expect(harness.routeNativeElement?.querySelector('app-archive-customer')).toBeNull();
    await harness.navigateByUrl('/customers');
    const list = http.expectOne((r) => r.url === '/api/v1/customers');
    expect(list.request.params.get('include_archived')).toBe('false');
    list.flush([]);
  });

  it('clears a confirmation when reusing the detail component for a different customer', async () => {
    const harness = await RouterTestingHarness.create('/customers/12');
    http.expectOne('/api/v1/customers/12/overview?include_archived=true').flush(testOverview);
    const component = harness.routeDebugElement!.componentInstance as CustomerDetail;
    component.archived({ ...testCustomer, is_archived: true });
    expect(component.confirmation()).toContain('archiviert');
    await harness.navigateByUrl('/customers/13');
    http
      .expectOne('/api/v1/customers/13/overview?include_archived=true')
      .flush({ customer: { ...testCustomer, id: 13 }, instruments: [] });
    expect(component.confirmation()).toBe('');
  });

  for (const path of ['/customers/new', '/customers/12', '/customers/12/edit']) {
    it(`protects ${path} and preserves the safe destination for login`, async () => {
      TestBed.inject(SessionState).clear();
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/login?returnUrl=' + encodeURIComponent(path));
      expect(safeReturnUrl(path)).toBe(path);
      http.expectNone((r) => r.url.includes('customers'));
    });
    it(`rejects customer-role accounts from ${path}`, async () => {
      TestBed.inject(SessionState).authenticate({ ...testUser, role: 'customer' });
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/access-denied');
      http.expectNone((r) => r.url.includes('customers'));
    });
  }
});
