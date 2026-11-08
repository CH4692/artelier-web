import { testManagedRepair } from '../../../testing/repairs';
import { testCustomer } from '../../../testing/customers';
import { testInstrument } from '../../../testing/instruments';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api.config';
import { DashboardService, MetricState } from './dashboard.service';

describe('Dashboard API integration', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/v1/' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses the existing status filter and authoritative total instead of counting the page', () => {
    let result: MetricState | undefined;
    TestBed.inject(DashboardService)
      .readyForPickupCount()
      .subscribe((state) => {
        result = state;
      });
    const request = http.expectOne((req) => req.url === '/api/v1/repairs');
    expect(request.request.params.get('status')).toBe('ready_for_pickup');
    expect(request.request.params.get('limit')).toBe('1');
    expect(request.request.params.has('include_archived')).toBe(false);
    request.flush([{ id: 12 }], { headers: { 'X-Total-Count': '1234' } });
    expect(result).toEqual({ status: 'available', value: 1234 });
  });

  it('preserves a real zero as available data', () => {
    let result: MetricState | undefined;
    TestBed.inject(DashboardService)
      .readyForPickupCount()
      .subscribe((state) => {
        result = state;
      });
    http
      .expectOne((req) => req.url === '/api/v1/repairs')
      .flush([], { headers: { 'X-Total-Count': '0' } });
    expect(result).toEqual({ status: 'available', value: 0 });
  });

  for (const total of [null, '', '-1', '1.5', 'unknown', '9007199254740992']) {
    it(`never substitutes a zero for missing or invalid totals: ${total}`, () => {
      let result: MetricState | undefined;
      TestBed.inject(DashboardService)
        .readyForPickupCount()
        .subscribe((state) => {
          result = state;
        });
      http
        .expectOne((req) => req.url === '/api/v1/repairs')
        .flush([], { headers: total === null ? {} : { 'X-Total-Count': total } });
      expect(result).toEqual({ status: 'unavailable' });
    });
  }
  it('requests a bounded server-filtered pickup page, preserves order and deduplicates related reads', () => {
    const snapshots = vi.fn();
    TestBed.inject(DashboardService).pickup().subscribe(snapshots);
    const request = http.expectOne((r) => r.url === '/api/v1/repairs');
    expect(request.request.params.get('status')).toBe('ready_for_pickup');
    expect(request.request.params.get('include_archived')).toBe('false');
    expect(request.request.params.get('offset')).toBe('0');
    expect(request.request.params.get('limit')).toBe('5');
    expect(request.request.params.has('sort_by')).toBe(false);
    request.flush(
      [
        { ...testManagedRepair, id: 20, status: 'ready_for_pickup' },
        { ...testManagedRepair, id: 22, status: 'ready_for_pickup' },
      ],
      { headers: { 'X-Total-Count': '12' } },
    );
    expect(snapshots).toHaveBeenCalledTimes(1);
    expect(snapshots.mock.calls[0][0]).toMatchObject({ total: 12, relationsPending: true });
    http.expectOne('/api/v1/customers/12').flush(testCustomer);
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    expect(snapshots).toHaveBeenCalledTimes(2);
    expect(
      snapshots.mock.lastCall![0].entries.map(
        (entry: { repair: { id: number } }) => entry.repair.id,
      ),
    ).toEqual([20, 22]);
    expect(snapshots.mock.lastCall![0].relationsPending).toBe(false);
  });
  it('keeps missing historical customers unknown and does not request invented aggregates', () => {
    const snapshots = vi.fn();
    TestBed.inject(DashboardService).pickup().subscribe(snapshots);
    http
      .expectOne((r) => r.url === '/api/v1/repairs')
      .flush([{ ...testManagedRepair, customer_id: null }]);
    http.expectNone((r) => r.url.includes('/customers/'));
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    expect(snapshots.mock.lastCall![0].entries[0].customerUnavailable).toBe(false);
    expect(snapshots.mock.lastCall![0].total).toBeNull();
  });
});
