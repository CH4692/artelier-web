import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InstrumentsService } from './instruments.service';
import { apiSessionInterceptor } from '../../core/interceptors/api-session.interceptor';
import { SessionState } from '../../core/auth/session-state';
import { SessionNavigation } from '../../core/auth/session-navigation';
import { testUser } from '../../../testing/auth';
import { testInstrument, testRepair } from '../../../testing/instruments';
import { InstrumentInput } from './instrument.models';
import { instrumentError } from './instrument-errors';

describe('Instrument API contracts', () => {
  let service: InstrumentsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(InstrumentsService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionState).authenticate(testUser);
    vi.spyOn(TestBed.inject(SessionNavigation), 'redirect').mockImplementation(() => undefined);
  });
  afterEach(() => http.verify());
  it('uses backend search, type/ownership filters, sorting, pagination and authoritative totals', () => {
    const result = vi.fn();
    service
      .list({
        q: 'TEST',
        type: 'violin',
        ownership: 'customer',
        offset: 25,
        limit: 25,
        include_archived: true,
        sort_by: 'maker',
        sort_order: 'desc',
      })
      .subscribe(result);
    const req = http.expectOne((r) => r.url === '/api/v1/instruments');
    expect(req.request.params.get('q')).toBe('TEST');
    expect(req.request.params.get('type')).toBe('violin');
    expect(req.request.params.get('ownership')).toBe('customer');
    expect(req.request.params.get('sort_by')).toBe('maker');
    expect(req.request.params.get('sort_order')).toBe('desc');
    expect(req.request.params.get('offset')).toBe('25');
    expect(req.request.withCredentials).toBe(true);
    req.flush([testInstrument], { headers: { 'X-Total-Count': '45' } });
    expect(result).toHaveBeenCalledWith({ instruments: [testInstrument], total: 45 });
  });
  for (const action of ['create', 'update'] as const) {
    it(`uses credentials and CSRF for ${action} without writing server-owned identifiers`, () => {
      const data: InstrumentInput = {
        type: 'bow',
        maker: null,
        year_of_manufacture: null,
        identification_number: null,
        notes: null,
        body_length_mm: null,
        bow_weight_g: 60.5,
        customer_id: null,
        ownership: 'workshop',
      };
      (action === 'create' ? service.create(data) : service.update(8, data)).subscribe();
      const req = http.expectOne(
        action === 'create' ? '/api/v1/instruments' : '/api/v1/instruments/8',
      );
      expect(req.request.method).toBe(action === 'create' ? 'POST' : 'PATCH');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
      expect(req.request.body).toEqual(data);
      expect(req.request.body.public_id).toBeUndefined();
      req.flush(testInstrument);
    });
  }
  it('reads the existing chronological history contract without computing or reordering repairs', () => {
    const result = vi.fn();
    service.history(8, 25).subscribe(result);
    const req = http.expectOne((r) => r.url === '/api/v1/instruments/8/history');
    expect(req.request.params.get('offset')).toBe('25');
    expect(req.request.params.get('limit')).toBe('25');
    req.flush(
      { instrument: testInstrument, repair_orders: [testRepair] },
      { headers: { 'X-Total-Count': '51' } },
    );
    expect(result).toHaveBeenCalledWith({
      history: { instrument: testInstrument, repair_orders: [testRepair] },
      total: 51,
    });
  });
  it('downloads QR codes through credentialed HTTP without changing the scan route', () => {
    service.qr(8).subscribe();
    const req = http.expectOne('/api/v1/instruments/8/qr-code.svg');
    expect(req.request.responseType).toBe('blob');
    expect(req.request.withCredentials).toBe(true);
    req.flush(new Blob(['<svg/>'], { type: 'image/svg+xml' }));
  });
  for (const status of [401, 403, 404, 409, 422, 503]) {
    it(`handles ${status} without displaying sensitive response details`, () => {
      let message = '';
      service.get(8).subscribe({
        error: (e) => {
          message = instrumentError(e);
        },
      });
      http
        .expectOne('/api/v1/instruments/8')
        .flush({ detail: 'private stack trace' }, { status, statusText: 'Failure' });
      expect(message).not.toContain('private');
      expect(message.length).toBeGreaterThan(10);
    });
  }
});
