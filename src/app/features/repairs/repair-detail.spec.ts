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
import { testManagedRepair } from '../../../testing/repairs';
import { RepairDetail } from './repair-detail';
import { RepairStatusEditor } from './repair-status-editor';
describe('Repair detail and protected routes', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionState).authenticate(testUser);
  });
  afterEach(() => http.verify());
  async function load(repair = testManagedRepair) {
    const harness = await RouterTestingHarness.create('/repairs/20');
    http.expectOne('/api/v1/repairs/20').flush(repair);
    http.expectOne('/api/v1/customers/12').flush(testCustomer);
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    await harness.fixture.whenStable();
    return harness;
  }
  it('renders resolved relations, description, notes, dates, status and edit actions', async () => {
    const h = await load();
    const text = h.routeNativeElement?.textContent;
    expect(text).toContain('Maria Beispiel');
    expect(text).toContain('TEST-8');
    expect(text).toContain('Angenommen');
    expect(text).toContain('Prüfung der Decke');
    expect(text).toContain('Nicht hinterlegt');
    expect(h.routeNativeElement?.querySelector('a[href="/repairs/20/edit"]')).not.toBeNull();
    expect(h.routeNativeElement?.querySelector('a[href="/customers/12"]')).not.toBeNull();
    expect(h.routeNativeElement?.querySelector('a[href="/instruments/8"]')).not.toBeNull();
  });
  it('preserves the order on failed independent relation requests', async () => {
    const h = await RouterTestingHarness.create('/repairs/20');
    http.expectOne('/api/v1/repairs/20').flush(testManagedRepair);
    http.expectOne('/api/v1/customers/12').flush({}, { status: 404, statusText: 'Missing' });
    http.expectOne('/api/v1/instruments/8').flush({}, { status: 503, statusText: 'Failure' });
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain('Auftrag #20');
    expect(h.routeNativeElement?.textContent).toContain('Auftrag bleibt verfügbar');
  });
  it('handles absent historical customer and archived orders', async () => {
    const h = await RouterTestingHarness.create('/repairs/20');
    http
      .expectOne('/api/v1/repairs/20')
      .flush({ ...testManagedRepair, customer_id: null, is_archived: true });
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain('Archiviert');
    http.expectNone('/api/v1/customers/null');
  });
  it('shows unknown and invalid IDs as not found', async () => {
    const h = await RouterTestingHarness.create('/repairs/bad');
    expect(h.routeNativeElement?.textContent).toContain('Auftrag nicht gefunden');
    await h.navigateByUrl('/repairs/999');
    http.expectOne('/api/v1/repairs/999').flush({}, { status: 404, statusText: 'Missing' });
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain('Auftrag nicht gefunden');
  });
  it('cancels stale detail and dependent requests on route reuse', async () => {
    const h = await RouterTestingHarness.create('/repairs/20');
    http.expectOne('/api/v1/repairs/20').flush(testManagedRepair);
    const customer = http.expectOne('/api/v1/customers/12');
    const instrument = http.expectOne('/api/v1/instruments/8');
    await h.navigateByUrl('/repairs/21');
    expect(customer.cancelled).toBe(true);
    expect(instrument.cancelled).toBe(true);
    http.expectOne('/api/v1/repairs/21').flush({ ...testManagedRepair, id: 21, customer_id: null });
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    expect((h.routeDebugElement!.componentInstance as RepairDetail).state()).toMatchObject({
      status: 'loaded',
      data: { id: 21 },
    });
  });
  for (const path of ['/repairs/new', '/repairs/20', '/repairs/20/edit']) {
    it(`resumes the protected ${path} deep link after login`, async () => {
      TestBed.inject(SessionState).clear();
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/login?returnUrl=' + encodeURIComponent(path));
      expect(safeReturnUrl(path)).toBe(path);
      http.expectNone((r) => r.url.startsWith('/api/v1/repairs'));
    });
    it(`denies customer role on ${path}`, async () => {
      TestBed.inject(SessionState).authenticate({ ...testUser, role: 'customer' });
      await RouterTestingHarness.create(path);
      expect(TestBed.inject(Router).url).toBe('/access-denied');
      http.expectNone((r) => r.url.startsWith('/api/v1/repairs'));
    });
  }
  it('updates status only after confirmation and opens the corresponding completed list', async () => {
    const h = await load({ ...testManagedRepair, status: 'ready_for_pickup' });
    const status = h.routeDebugElement!.query(
      (node) => node.componentInstance instanceof RepairStatusEditor,
    ).componentInstance as RepairStatusEditor;
    status.target.setValue('completed');
    h.routeNativeElement!.querySelector('app-repair-status-editor form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    status.submit();
    const detail = h.routeDebugElement!.componentInstance as RepairDetail;
    expect(detail.state()).toMatchObject({ data: { status: 'ready_for_pickup' } });
    http.expectOne('/api/v1/repairs/20/status').flush({
      ...testManagedRepair,
      status: 'completed',
      status_updated_at: '2026-02-10T12:00:00Z',
    });
    h.detectChanges();
    expect(detail.state()).toMatchObject({ data: { status: 'completed' } });
    expect(h.routeNativeElement?.textContent).toContain('Status gespeichert: Abgeschlossen');
    expect(h.routeNativeElement?.querySelector('a[href*="view=closed"]')).not.toBeNull();
    await h.navigateByUrl('/repairs?view=closed&status=completed');
    await h.fixture.whenStable();
    const req = http.expectOne((r) => r.url === '/api/v1/repairs');
    expect(req.request.params.get('status')).toBe('completed');
    req.flush([{ ...testManagedRepair, status: 'completed' }]);
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain('Auftrag #20');
  });
  it('preserves confirmed status and requested selection on a rejected transition and permits retry', async () => {
    const h = await load();
    const status = h.routeDebugElement!.query(
      (node) => node.componentInstance instanceof RepairStatusEditor,
    ).componentInstance as RepairStatusEditor;
    status.target.setValue('completed');
    status.submit();
    http
      .expectOne('/api/v1/repairs/20/status')
      .flush({ detail: 'private state machine details' }, { status: 409, statusText: 'Conflict' });
    h.detectChanges();
    expect((h.routeDebugElement!.componentInstance as RepairDetail).state()).toMatchObject({
      data: { status: 'accepted' },
    });
    expect(status.target.value).toBe('completed');
    expect(status.pending()).toBe(false);
    expect(h.routeNativeElement?.textContent).toContain('nicht erlaubt');
    expect(h.routeNativeElement?.textContent).not.toContain('private');
    status.target.setValue('in_progress');
    status.submit();
    http
      .expectOne('/api/v1/repairs/20/status')
      .flush({ ...testManagedRepair, status: 'in_progress' });
    expect(status.success()).toContain('In Bearbeitung');
  });
});
