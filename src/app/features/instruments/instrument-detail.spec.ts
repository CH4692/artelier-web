import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { SessionState } from '../../core/auth/session-state';
import { safeReturnUrl } from '../../core/auth/return-url';
import { testUser } from '../../../testing/auth';
import { testCustomer } from '../../../testing/customers';
import { testInstrument } from '../../../testing/instruments';
import { InstrumentDetail } from './instrument-detail';

describe('Instrument detail routes', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionState).authenticate(testUser);
  });
  afterEach(() => http.verify());
  async function load() {
    const harness = await RouterTestingHarness.create('/instruments/8');
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    await harness.fixture.whenStable();
    http.expectOne('/api/v1/customers/12').flush(testCustomer);
    http
      .expectOne((r) => r.url === '/api/v1/instruments/8/history')
      .flush({ instrument: testInstrument, repair_orders: [] });
    harness.detectChanges();
    return harness;
  }
  it('shows instrument metadata, a resolved customer link, edit action and history', async () => {
    const harness = await load();
    expect(harness.routeNativeElement?.textContent).toContain('TEST-8');
    expect(harness.routeNativeElement?.textContent).toContain('Maria Beispiel');
    expect(harness.routeNativeElement?.querySelector('a[href="/customers/12"]')).not.toBeNull();
    expect(
      harness.routeNativeElement?.querySelector('a[href="/instruments/8/edit"]'),
    ).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Reparaturhistorie');
  });
  it('keeps instrument data available when its customer request fails', async () => {
    const harness = await RouterTestingHarness.create('/instruments/8');
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    await harness.fixture.whenStable();
    http.expectOne('/api/v1/customers/12').flush({}, { status: 404, statusText: 'Not Found' });
    http
      .expectOne((r) => r.url === '/api/v1/instruments/8/history')
      .flush({ instrument: testInstrument, repair_orders: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('TEST-8');
    expect(harness.routeNativeElement?.textContent).toContain('Kundendaten sind nicht verfügbar');
  });
  it('reports unavailable QR configuration and prevents duplicate download requests', async () => {
    const harness = await load();
    const component = harness.routeDebugElement!.componentInstance as InstrumentDetail;
    component.downloadQr();
    component.downloadQr();
    http
      .expectOne('/api/v1/instruments/8/qr-code.svg')
      .flush(new Blob(), { status: 503, statusText: 'Unavailable' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('QR-Code konnte nicht geladen');
    expect(component.qrPending()).toBe(false);
  });
  it('shows 404 and invalid IDs as not found, with no invented record', async () => {
    const harness = await RouterTestingHarness.create('/instruments/missing');
    expect(harness.routeNativeElement?.textContent).toContain('Instrument nicht gefunden');
    await harness.navigateByUrl('/instruments/999');
    http.expectOne('/api/v1/instruments/999').flush({}, { status: 404, statusText: 'Not Found' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Instrument nicht gefunden');
  });
  it('marks archived instruments while preserving their detail access', async () => {
    const harness = await RouterTestingHarness.create('/instruments/8');
    http
      .expectOne('/api/v1/instruments/8')
      .flush({ ...testInstrument, customer_id: null, is_archived: true });
    await harness.fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/v1/instruments/8/history')
      .flush({ instrument: testInstrument, repair_orders: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Archiviert');
  });
  for (const path of ['/instruments/new', '/instruments/8', '/instruments/8/edit']) {
    it(`protects ${path} and resumes it after login`, async () => {
      TestBed.inject(SessionState).clear();
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/login?returnUrl=' + encodeURIComponent(path));
      expect(safeReturnUrl(path)).toBe(path);
      http.expectNone((r) => r.url.includes('instruments'));
    });
    it(`rejects customer-role access to ${path}`, async () => {
      TestBed.inject(SessionState).authenticate({ ...testUser, role: 'customer' });
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/access-denied');
      http.expectNone((r) => r.url.includes('instruments'));
    });
  }
});
