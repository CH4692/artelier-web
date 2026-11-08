import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { SessionState } from '../../core/auth/session-state';
import { testUser } from '../../../testing/auth';
import { testManagedRepair } from '../../../testing/repairs';
import { RepairListSection } from './repair-list-section';
import { Repairs } from './repairs';
describe('Repair list and views', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionState).authenticate(testUser);
  });
  afterEach(() => http.verify());
  function flushLists() {
    const requests = http.match((r) => r.url === '/api/v1/repairs');
    for (const req of requests)
      req.flush(req.request.params.get('status') === 'accepted' ? [testManagedRepair] : [], {
        headers: { 'X-Total-Count': req.request.params.get('status') === 'accepted' ? '1' : '0' },
      });
    return requests;
  }
  it('loads every open status with independent bounded server pagination and real links', async () => {
    const harness = await RouterTestingHarness.create('/repairs');
    await harness.fixture.whenStable();
    const requests = flushLists();
    expect(requests.map((r) => r.request.params.get('status'))).toEqual([
      'accepted',
      'awaiting_approval',
      'in_progress',
      'awaiting_materials',
      'ready_for_pickup',
    ]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('a[href="/repairs/20"]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('a[href="/customers/12"]')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('a[href="/instruments/8"]')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Keine Aufträge');
  });
  it('separates completed and cancelled records and restores filter state in the URL', async () => {
    const harness = await RouterTestingHarness.create('/repairs?view=closed');
    await harness.fixture.whenStable();
    const requests = flushLists();
    expect(requests.map((r) => r.request.params.get('status'))).toEqual(['completed', 'cancelled']);
    const component = harness.routeDebugElement!.componentInstance as Repairs;
    component.setStatus('completed');
    await harness.fixture.whenStable();
    const current = flushLists();
    expect(current).toHaveLength(0);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('app-repair-list-section')).toHaveLength(1);
    expect(TestBed.inject(Router).url).toContain('status=completed');
    await harness.fixture.whenStable();
    expect(
      harness.routeNativeElement?.querySelector<HTMLSelectElement>('#repair-status-filter')?.value,
    ).toBe('completed');
  });
  it('passes customer and archive filters through without displaying unrelated partial-page data', async () => {
    const harness = await RouterTestingHarness.create(
      '/repairs?status=accepted&customer_id=12&archived=true',
    );
    await harness.fixture.whenStable();
    http.expectOne('/api/v1/customers/12').flush({
      id: 12,
      first_name: 'Maria',
      last_name: 'Beispiel',
      email: null,
      phone: null,
      is_archived: false,
    });
    const req = http.expectOne((r) => r.url === '/api/v1/repairs');
    expect(req.request.params.get('customer_id')).toBe('12');
    expect(req.request.params.get('include_archived')).toBe('true');
    req.flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Keine Aufträge');
  });
  it('rejects invalid status/view/ID filters without requesting data', async () => {
    const harness = await RouterTestingHarness.create('/repairs?view=closed&status=in_progress');
    http.expectNone((r) => r.url === '/api/v1/repairs');
    expect(harness.routeNativeElement?.textContent).toContain('ungültig');
  });
  it('paginates, retries errors and cancels superseded section requests', async () => {
    const fixture = TestBed.createComponent(RepairListSection);
    fixture.componentRef.setInput('status', 'accepted');
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/v1/repairs')
      .flush([testManagedRepair], { headers: { 'X-Total-Count': '30' } });
    const c = fixture.componentInstance;
    expect(c.hasNext({ repairs: [testManagedRepair], total: 30 })).toBe(true);
    c.page(1);
    const old = http.expectOne((r) => r.url === '/api/v1/repairs');
    expect(old.request.params.get('offset')).toBe('25');
    fixture.componentRef.setInput('status', 'completed');
    await fixture.whenStable();
    expect(old.cancelled).toBe(true);
    const newer = http.expectOne((r) => r.url === '/api/v1/repairs');
    expect(newer.request.params.get('offset')).toBe('0');
    newer.flush({ detail: 'private' }, { status: 503, statusText: 'Failure' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('private');
    c.retry();
    http.expectOne((r) => r.url === '/api/v1/repairs').flush([]);
    expect(c.state().status).toBe('loaded');
  });
});
