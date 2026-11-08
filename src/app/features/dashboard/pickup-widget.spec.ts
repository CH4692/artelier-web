import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PickupWidget } from './pickup-widget';
import { Dashboard } from './dashboard';
import { testManagedRepair } from '../../../testing/repairs';
import { testCustomer } from '../../../testing/customers';
import { testInstrument } from '../../../testing/instruments';
const readyRepair = { ...testManagedRepair, status: 'ready_for_pickup' };
describe('Pickup dashboard widget', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function setup() {
    const fixture = TestBed.createComponent(PickupWidget);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance };
  }
  function list() {
    return http.expectOne((r) => r.url === '/api/v1/repairs' && r.params.get('limit') === '5');
  }
  it('renders real orders before optional names, then links resolved customers and instruments', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.textContent).toContain('werden geladen');
    list().flush([readyRepair], { headers: { 'X-Total-Count': '1234' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Auftrag #20');
    expect(fixture.nativeElement.textContent).toContain('1.234');
    expect(fixture.nativeElement.textContent).toContain('werden ergänzt');
    http.expectOne('/api/v1/customers/12').flush(testCustomer);
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Maria Beispiel');
    expect(element.textContent).toContain('TEST-8');
    expect(element.textContent).toContain('10.02.2026');
    expect(element.textContent).toContain('Abholbereit');
    expect(element.querySelector('a[href="/repairs/20"]')).not.toBeNull();
    expect(element.querySelector('a[href="/customers/12"]')).not.toBeNull();
    expect(element.querySelector('a[href="/instruments/8"]')).not.toBeNull();
    expect(element.querySelector('.all-link')?.getAttribute('href')).toBe(
      '/repairs?view=open&status=ready_for_pickup',
    );
    expect(element.textContent).not.toContain(readyRepair.internal_notes);
  });
  it('communicates empty data only after a successful read', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.textContent).not.toContain('Keine Aufträge abholbereit');
    list().flush([], { headers: { 'X-Total-Count': '0' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Keine Aufträge abholbereit');
  });
  it('keeps order links available when optional lookups fail, without leaking raw errors', async () => {
    const { fixture, component } = await setup();
    list().flush([readyRepair]);
    http
      .expectOne('/api/v1/customers/12')
      .flush({ detail: 'private customer' }, { status: 404, statusText: 'Missing' });
    http
      .expectOne('/api/v1/instruments/8')
      .flush({ detail: 'private instrument' }, { status: 503, statusText: 'Failure' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Kundendaten nicht verfügbar');
    expect(fixture.nativeElement.textContent).toContain('Instrumentendaten nicht verfügbar');
    expect(fixture.nativeElement.querySelector('a[href="/repairs/20"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('private');
    expect(component.pending()).toBe(false);
  });
  it('refreshes without duplicates and never presents a failed refresh as a current empty result', async () => {
    const { fixture, component } = await setup();
    list().flush([]);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.pickup-refresh');
    button.focus();
    button.click();
    component.refresh();
    const request = list();
    request.flush({ detail: 'sensitive' }, { status: 503, statusText: 'Failure' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Abholliste nicht verfügbar');
    expect(fixture.nativeElement.textContent).not.toContain('Keine Aufträge abholbereit');
    expect(fixture.nativeElement.textContent).not.toContain('sensitive');
    expect(document.activeElement).toBe(button);
    button.click();
    list().flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Keine Aufträge abholbereit');
  });
  it('cancels superseded refreshes, optional lookups and outstanding work on destroy', async () => {
    const { fixture, component } = await setup();
    const first = list();
    fixture.componentRef.setInput('refreshKey', 1);
    await fixture.whenStable();
    expect(first.cancelled).toBe(true);
    list().flush([readyRepair]);
    const customer = http.expectOne('/api/v1/customers/12');
    const instrument = http.expectOne('/api/v1/instruments/8');
    fixture.componentRef.setInput('refreshKey', 2);
    await fixture.whenStable();
    expect(customer.cancelled).toBe(true);
    expect(instrument.cancelled).toBe(true);
    const last = list();
    fixture.destroy();
    expect(last.cancelled).toBe(true);
    expect(component.pending()).toBe(false);
  });
  for (const status of [401, 403, 404, 503])
    it(`displays safe pickup failure for ${status} without inventing an empty state`, async () => {
      const { fixture } = await setup();
      list().flush({ detail: 'private server data' }, { status, statusText: 'Failure' });
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain('Abholliste nicht verfügbar');
      expect(fixture.nativeElement.textContent).not.toContain('private server data');
      expect(fixture.nativeElement.textContent).not.toContain('Keine Aufträge abholbereit');
    });
});
describe('Independent dashboard requests', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('shows a successful pickup list even when the summary count fails', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/v1/repairs' && r.params.get('limit') === '1')
      .flush({}, { status: 503, statusText: 'Failure' });
    http
      .expectOne((r) => r.url === '/api/v1/repairs' && r.params.get('limit') === '5')
      .flush([{ ...readyRepair, customer_id: null, expected_completion_date: null }]);
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Daten konnten nicht geladen');
    expect(
      fixture.nativeElement.querySelector('app-pickup-widget a[href="/repairs/20"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nicht hinterlegt');
  });
  it('refreshes both widgets and preserves safe navigation when the list fails independently', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    http
      .expectOne((r) => r.url === '/api/v1/repairs' && r.params.get('limit') === '1')
      .flush([], { headers: { 'X-Total-Count': '5' } });
    http
      .expectOne((r) => r.url === '/api/v1/repairs' && r.params.get('limit') === '5')
      .flush({}, { status: 503, statusText: 'Failure' });
    await fixture.whenStable();
    expect(fixture.componentInstance.ready()).toEqual({ status: 'available', value: 5 });
    expect(fixture.nativeElement.querySelector('a[href="/repairs?view=open"]')).not.toBeNull();
    fixture.nativeElement.querySelector('.refresh-all').click();
    await fixture.whenStable();
    const requests = http.match((r) => r.url === '/api/v1/repairs');
    expect(requests).toHaveLength(2);
    for (const request of requests) request.flush([], { headers: { 'X-Total-Count': '0' } });
    await fixture.whenStable();
    expect(fixture.componentInstance.ready()).toEqual({ status: 'available', value: 0 });
    expect(fixture.nativeElement.querySelector('app-pickup-widget').textContent).toContain(
      'Keine Aufträge abholbereit',
    );
  });
});
