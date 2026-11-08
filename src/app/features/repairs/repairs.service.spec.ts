import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiSessionInterceptor } from '../../core/interceptors/api-session.interceptor';
import { SessionState } from '../../core/auth/session-state';
import { SessionNavigation } from '../../core/auth/session-navigation';
import { testUser } from '../../../testing/auth';
import { testManagedRepair } from '../../../testing/repairs';
import { RepairsService } from './repairs.service';
import { repairError } from './repair-errors';
describe('Repair API contracts', () => {
  let service: RepairsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(RepairsService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionState).authenticate(testUser);
    vi.spyOn(TestBed.inject(SessionNavigation), 'redirect').mockImplementation(() => undefined);
  });
  afterEach(() => http.verify());
  it('uses supported server filters, bounded pagination and authoritative totals without invented search or sorting', () => {
    const result = vi.fn();
    service
      .list({ status: 'in_progress', customer_id: 12, include_archived: true, offset: 25 })
      .subscribe(result);
    const req = http.expectOne((r) => r.url === '/api/v1/repairs');
    expect(req.request.params.get('status')).toBe('in_progress');
    expect(req.request.params.get('customer_id')).toBe('12');
    expect(req.request.params.get('offset')).toBe('25');
    expect(req.request.params.get('limit')).toBe('25');
    expect(req.request.params.get('include_archived')).toBe('true');
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.has('sort_by')).toBe(false);
    req.flush([testManagedRepair], { headers: { 'X-Total-Count': '45' } });
    expect(result).toHaveBeenCalledWith({ repairs: [testManagedRepair], total: 45 });
  });
  it('keeps unknown totals unknown and omits an absent customer filter', () => {
    const result = vi.fn();
    service
      .list({ status: 'accepted', customer_id: null, include_archived: false, offset: 0 })
      .subscribe(result);
    const req = http.expectOne((r) => r.url === '/api/v1/repairs');
    expect(req.request.params.has('customer_id')).toBe(false);
    req.flush([]);
    expect(result).toHaveBeenCalledWith({ repairs: [], total: null });
  });
  it('reads detail and document metadata', () => {
    const result = vi.fn();
    service.get(20).subscribe(result);
    http.expectOne('/api/v1/repairs/20').flush(testManagedRepair);
    expect(result).toHaveBeenCalledWith(testManagedRepair);
  });
  for (const action of ['create', 'update', 'status'] as const)
    it(`uses credentials and CSRF for ${action}`, () => {
      const update = {
        work_description: 'Steg anpassen',
        expected_completion_date: null,
        internal_notes: null,
      };
      const body =
        action === 'create'
          ? { ...update, customer_id: 12, instrument_id: 8 }
          : action === 'status'
            ? { status: 'in_progress' }
            : update;
      const request =
        action === 'create'
          ? service.create({ ...update, customer_id: 12, instrument_id: 8 })
          : action === 'update'
            ? service.update(20, update)
            : service.changeStatus(20, 'in_progress');
      request.subscribe();
      const req = http.expectOne(
        action === 'create'
          ? '/api/v1/repairs'
          : action === 'status'
            ? '/api/v1/repairs/20/status'
            : '/api/v1/repairs/20',
      );
      expect(req.request.method).toBe(action === 'create' ? 'POST' : 'PATCH');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
      expect(req.request.body).toEqual(body);
      req.flush(testManagedRepair);
    });
  for (const status of [401, 403, 404, 409, 422, 503])
    it(`handles ${status} without exposing server details`, () => {
      const error = vi.fn();
      service
        .update(20, {
          work_description: 'Arbeit',
          internal_notes: null,
          expected_completion_date: null,
        })
        .subscribe({ error });
      http
        .expectOne('/api/v1/repairs/20')
        .flush({ detail: 'sensitive data' }, { status, statusText: 'Failure' });
      expect(error).toHaveBeenCalledOnce();
      expect(repairError(error.mock.calls[0][0])).not.toContain('sensitive');
    });
});
