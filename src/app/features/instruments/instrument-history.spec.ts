import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InstrumentHistoryView } from './instrument-history';
import { testInstrument, testRepair } from '../../../testing/instruments';

describe('Instrument repair history', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InstrumentHistoryView],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function setup() {
    const fixture = TestBed.createComponent(InstrumentHistoryView);
    fixture.componentRef.setInput('instrumentId', 8);
    await fixture.whenStable();
    return fixture;
  }
  const request = () => http.expectOne((r) => r.url === '/api/v1/instruments/8/history');
  it('renders backend order, statuses and supplied dates with repair detail links', async () => {
    const fixture = await setup();
    expect(fixture.nativeElement.textContent).toContain('wird geladen');
    request().flush(
      {
        instrument: testInstrument,
        repair_orders: [
          testRepair,
          { ...testRepair, id: 21, performed_at: null, status: 'in_progress', is_archived: true },
        ],
      },
      { headers: { 'X-Total-Count': '2' } },
    );
    await fixture.whenStable();
    expect(
      [...fixture.nativeElement.querySelectorAll('h3')].map((h: HTMLElement) => h.textContent),
    ).toEqual(['Auftrag #20', 'Auftrag #21']);
    expect(fixture.nativeElement.textContent).toContain('Steg anpassen');
    expect(fixture.nativeElement.textContent).toContain('Abgeschlossen');
    expect(fixture.nativeElement.textContent).toContain('Archiviert');
    expect(fixture.nativeElement.textContent).toContain('01.02.2026');
    expect(fixture.nativeElement.querySelector('a[href="/repairs/20"]')).not.toBeNull();
  });
  it('shows a truthful empty history', async () => {
    const fixture = await setup();
    request().flush(
      { instrument: testInstrument, repair_orders: [] },
      { headers: { 'X-Total-Count': '0' } },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Noch keine Reparaturen');
  });
  it('keeps history errors separate and permits retry', async () => {
    const fixture = await setup();
    request().flush({ detail: 'private' }, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('private');
    expect(fixture.nativeElement.textContent).toContain('Historie nicht verfügbar');
    fixture.componentInstance.retry();
    request().flush({ instrument: testInstrument, repair_orders: [testRepair] });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Auftrag #20');
  });
  it('paginates through the existing backend and cancels when switching instruments', async () => {
    const fixture = await setup();
    request().flush(
      { instrument: testInstrument, repair_orders: [testRepair] },
      { headers: { 'X-Total-Count': '26' } },
    );
    fixture.componentInstance.page(1);
    const page = request();
    expect(page.request.params.get('offset')).toBe('25');
    fixture.componentRef.setInput('instrumentId', 9);
    await fixture.whenStable();
    expect(page.cancelled).toBe(true);
    const next = http.expectOne((r) => r.url === '/api/v1/instruments/9/history');
    expect(next.request.params.get('offset')).toBe('0');
    next.flush({ instrument: { ...testInstrument, id: 9 }, repair_orders: [] });
  });
});
