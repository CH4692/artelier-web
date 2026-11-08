import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomerSelect } from './customer-select';
import { testCustomer } from '../../../testing/customers';

describe('Searchable customer selection', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CustomerSelect],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('searches and pages existing customers, including clearly labeled archived records', async () => {
    const fixture = TestBed.createComponent(CustomerSelect);
    await fixture.whenStable();
    fixture.componentInstance.show();
    const req = http.expectOne((r) => r.url === '/api/v1/customers');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('include_archived')).toBe('true');
    req.flush([{ ...testCustomer, is_archived: true }], { headers: { 'X-Total-Count': '15' } });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Archiviert');
    fixture.componentInstance.page(1);
    const page = http.expectOne((r) => r.url === '/api/v1/customers');
    expect(page.request.params.get('offset')).toBe('10');
    page.flush([]);
  });
  it('debounces queries, cancels old searches and changes selection only on an explicit action', async () => {
    const fixture = TestBed.createComponent(CustomerSelect);
    const chosen = vi.fn();
    fixture.componentInstance.selectionChange.subscribe(chosen);
    await fixture.whenStable();
    fixture.componentInstance.show();
    const old = http.expectOne((r) => r.url === '/api/v1/customers');
    fixture.componentInstance.search.setValue('Ma');
    await new Promise((resolve) => setTimeout(resolve, 60));
    fixture.componentInstance.search.setValue('Maria');
    http.expectNone((r) => r.url === '/api/v1/customers');
    await vi.waitFor(
      () => {
        const matches = http.match((r) => r.url === '/api/v1/customers');
        expect(matches.length).toBe(1);
        expect(matches[0].request.params.get('q')).toBe('Maria');
        matches[0].flush([testCustomer]);
      },
      { timeout: 1500 },
    );
    expect(old.cancelled).toBe(true);
    expect(chosen).not.toHaveBeenCalled();
    fixture.componentInstance.choose(12);
    expect(chosen).toHaveBeenCalledExactlyOnceWith(12);
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
  });
  it('resolves an existing owner independently and preserves its ID after a loading failure', async () => {
    const fixture = TestBed.createComponent(CustomerSelect);
    fixture.componentRef.setInput('selectedId', 12);
    await fixture.whenStable();
    http.expectOne('/api/v1/customers/12').flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Zuordnung bleibt erhalten');
    expect(fixture.componentInstance.selectedId()).toBe(12);
    fixture.componentInstance.retrySelected();
    http.expectOne('/api/v1/customers/12').flush(testCustomer);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Maria Beispiel');
  });
  it('distinguishes empty search, error and retry without selecting a fabricated customer', async () => {
    const fixture = TestBed.createComponent(CustomerSelect);
    await fixture.whenStable();
    fixture.componentInstance.show();
    http
      .expectOne((r) => r.url === '/api/v1/customers')
      .flush({ detail: 'private' }, { status: 500, statusText: 'Failure' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('private');
    fixture.componentInstance.retry();
    http.expectOne((r) => r.url === '/api/v1/customers').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Keine passenden Kunden');
  });
  it('blocks changes when disabled and supports explicitly removing the association', async () => {
    const fixture = TestBed.createComponent(CustomerSelect);
    const chosen = vi.fn();
    fixture.componentInstance.selectionChange.subscribe(chosen);
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    fixture.componentInstance.show();
    fixture.componentInstance.choose(12);
    expect(chosen).not.toHaveBeenCalled();
    fixture.componentRef.setInput('disabled', false);
    fixture.detectChanges();
    fixture.componentInstance.choose(null);
    expect(chosen).toHaveBeenCalledExactlyOnceWith(null);
  });
});
