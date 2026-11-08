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
});
