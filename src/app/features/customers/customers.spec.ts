import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { SessionState } from '../../core/auth/session-state';
import { testUser } from '../../../testing/auth';
import { testCustomer } from '../../../testing/customers';
import { Customers } from './customers';

describe('Customer list', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionState).authenticate(testUser);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });
  const request = () => http.expectOne((r) => r.url === '/api/v1/customers');

  it('renders loading, contact data, archive labels and dedicated detail links', async () => {
    const harness = await RouterTestingHarness.create('/customers');
    expect(harness.routeNativeElement?.textContent).toContain('werden geladen');
    request().flush(
      [testCustomer, { ...testCustomer, id: 13, email: null, phone: null, is_archived: true }],
      { headers: { 'X-Total-Count': '2' } },
    );
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Maria Beispiel');
    expect(harness.routeNativeElement?.textContent).toContain('maria@example.com');
    expect(harness.routeNativeElement?.querySelector('tbody a')?.getAttribute('href')).toBe(
      '/customers/12',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Archiviert');
    expect(harness.routeNativeElement?.textContent).toContain('Nicht hinterlegt');
  });

  it('debounces search, resets pagination and cancels superseded requests', async () => {
    const harness = await RouterTestingHarness.create('/customers?offset=25');
    request().flush([], { headers: { 'X-Total-Count': '50' } });
    const component = harness.routeDebugElement!.componentInstance as Customers;
    component.search.setValue('Ma');
    await new Promise((resolve) => setTimeout(resolve, 80));
    component.search.setValue('Maria');
    http.expectNone((r) => r.url === '/api/v1/customers');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('q=Maria'), {
      timeout: 1500,
    });
    const old = request();
    expect(old.request.params.get('offset')).toBe('0');
    component.search.setValue('Beispiel');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('q=Beispiel'), {
      timeout: 1500,
    });
    expect(old.cancelled).toBe(true);
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Keine passenden Kunden');
    // A restored URL must not suppress re-entering a previously searched term.
    await harness.navigateByUrl('/customers');
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    component.search.setValue('Beispiel');
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('q=Beispiel'), {
      timeout: 1500,
    });
    request().flush([], { headers: { 'X-Total-Count': '0' } });
  });

  it('uses server pagination and archived filters and restores them from URLs', async () => {
    const harness = await RouterTestingHarness.create(
      '/customers?q=Maria&offset=25&include_archived=true',
    );
    const req = request();
    expect(req.request.params.get('include_archived')).toBe('true');
    expect(req.request.params.get('offset')).toBe('25');
    req.flush([testCustomer], { headers: { 'X-Total-Count': '51' } });
    const component = harness.routeDebugElement!.componentInstance as Customers;
    component.page(1);
    await harness.fixture.whenStable();
    const next = request();
    expect(next.request.params.get('offset')).toBe('50');
    await harness.navigateByUrl('/customers');
    expect(next.cancelled).toBe(true);
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Noch keine Kunden');
  });

  it('offers retry after failure without claiming the list is empty', async () => {
    const harness = await RouterTestingHarness.create('/customers');
    request().flush({ detail: 'private error' }, { status: 503, statusText: 'Failure' });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('private');
    expect(harness.routeNativeElement?.textContent).not.toContain('Noch keine Kunden');
    const component = harness.routeDebugElement!.componentInstance as Customers;
    component.retry();
    request().flush([], { headers: { 'X-Total-Count': '0' } });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Noch keine Kunden');
  });
});
