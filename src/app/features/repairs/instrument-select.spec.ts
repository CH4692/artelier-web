import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InstrumentSelect } from './instrument-select';
import { testInstrument } from '../../../testing/instruments';
describe('Dependent repair instrument selection', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InstrumentSelect],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });
  async function setup(customer: number | null = 12) {
    const fixture = TestBed.createComponent(InstrumentSelect);
    fixture.componentRef.setInput('customerId', customer);
    await fixture.whenStable();
    return { fixture, component: fixture.componentInstance };
  }
  it('requires a customer before searching', async () => {
    const { component, fixture } = await setup(null);
    component.show();
    http.expectNone((r) => r.url === '/api/v1/instruments');
    expect(fixture.nativeElement.textContent).toContain('zuerst einen Kunden');
    expect(component.open()).toBe(false);
  });
  it('filters server-side, labels archived results, paginates and selects explicitly', async () => {
    const { fixture, component } = await setup();
    const selected = vi.fn();
    component.selectionChange.subscribe(selected);
    component.show();
    const req = http.expectOne((r) => r.url === '/api/v1/instruments');
    expect(req.request.params.get('customer_id')).toBe('12');
    expect(req.request.params.get('include_archived')).toBe('true');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush([{ ...testInstrument, is_archived: true }], { headers: { 'X-Total-Count': '12' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Archiviert');
    expect(selected).not.toHaveBeenCalled();
    component.page(1);
    const page = http.expectOne((r) => r.url === '/api/v1/instruments');
    expect(page.request.params.get('offset')).toBe('10');
    page.flush([testInstrument]);
    fixture.nativeElement.querySelector('.result').click();
    expect(selected).toHaveBeenCalledWith(8);
  });
  it('debounces search and cancels both stale queries and old-customer requests', async () => {
    const { fixture, component } = await setup();
    vi.useFakeTimers();
    component.show();
    const old = http.expectOne((r) => r.url === '/api/v1/instruments');
    component.search.setValue('TEST');
    await vi.advanceTimersByTimeAsync(299);
    expect(old.cancelled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(old.cancelled).toBe(true);
    const search = http.expectOne((r) => r.url === '/api/v1/instruments');
    expect(search.request.params.get('q')).toBe('TEST');
    fixture.componentRef.setInput('customerId', 13);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(search.cancelled).toBe(true);
    expect(component.search.value).toBe('');
    component.show();
    const other = http.expectOne((r) => r.url === '/api/v1/instruments');
    expect(other.request.params.get('customer_id')).toBe('13');
    expect(other.request.params.get('q')).toBe('');
    other.flush([]);
    expect(component.results()).toMatchObject({ status: 'loaded', data: { instruments: [] } });
  });
  it('renders loading, safe errors, retries and empty results', async () => {
    const { fixture, component } = await setup();
    component.show();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('werden gesucht');
    http
      .expectOne((r) => r.url === '/api/v1/instruments')
      .flush({ detail: 'sensitive' }, { status: 503, statusText: 'Failure' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('sensitive');
    component.retry();
    http.expectOne((r) => r.url === '/api/v1/instruments').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Keine passenden Instrumente');
  });
  it('preserves a selected ID on failed lookup and suppresses disabled changes', async () => {
    const { fixture, component } = await setup();
    fixture.componentRef.setInput('selectedId', 8);
    await fixture.whenStable();
    http.expectOne('/api/v1/instruments/8').flush({}, { status: 404, statusText: 'Missing' });
    expect(component.selectedId()).toBe(8);
    component.retrySelected();
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const selected = vi.fn();
    component.selectionChange.subscribe(selected);
    component.choose(null);
    component.show();
    expect(selected).not.toHaveBeenCalled();
    expect(component.open()).toBe(false);
  });
});
