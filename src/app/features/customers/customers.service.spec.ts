import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomersService } from './customers.service';
import { apiSessionInterceptor } from '../../core/interceptors/api-session.interceptor';
import { SessionState } from '../../core/auth/session-state';
import { SessionNavigation } from '../../core/auth/session-navigation';
import { testUser } from '../../../testing/auth';
import { testCustomer, testOverview } from '../../../testing/customers';
import { customerError } from './customer-errors';

describe('Customer API contracts', () => {
  let service: CustomersService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(CustomersService);
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionState).authenticate(testUser);
    vi.spyOn(TestBed.inject(SessionNavigation), 'redirect').mockImplementation(() => undefined);
  });
  afterEach(() => http.verify());

  it('uses backend search, archive filtering and bounded pagination with the server total', () => {
    const result = vi.fn();
    service.list('Maria %', 25, 25, true).subscribe(result);
    const req = http.expectOne((r) => r.url === '/api/v1/customers');
    expect(req.request.params.get('q')).toBe('Maria %');
    expect(req.request.params.get('offset')).toBe('25');
    expect(req.request.params.get('limit')).toBe('25');
    expect(req.request.params.get('include_archived')).toBe('true');
    expect(req.request.withCredentials).toBe(true);
    req.flush([testCustomer], { headers: { 'X-Total-Count': '40' } });
    expect(result).toHaveBeenCalledWith({ customers: [testCustomer], total: 40 });
  });

  it('does not invent a total from a paginated body if the header is absent', () => {
    const result = vi.fn();
    service.list('', 0, 25, false).subscribe(result);
    http.expectOne((r) => r.url === '/api/v1/customers').flush([testCustomer]);
    expect(result).toHaveBeenCalledWith({ customers: [testCustomer], total: null });
  });

  it('reads customer details and the overview including archived instruments', () => {
    service.get(12).subscribe();
    http.expectOne('/api/v1/customers/12').flush(testCustomer);
    const result = vi.fn();
    service.overview(12).subscribe(result);
    http.expectOne('/api/v1/customers/12/overview?include_archived=true').flush(testOverview);
    expect(result).toHaveBeenCalledWith(testOverview);
  });

  for (const action of ['create', 'update', 'archive'] as const) {
    it(`uses session credentials and the CSRF header for ${action}`, () => {
      const data = { first_name: 'Maria', last_name: 'Beispiel', email: null, phone: null };
      const request =
        action === 'create'
          ? service.create(data)
          : action === 'update'
            ? service.update(12, data)
            : service.archive(12);
      request.subscribe();
      const req = http.expectOne(
        action === 'create'
          ? '/api/v1/customers'
          : action === 'update'
            ? '/api/v1/customers/12'
            : '/api/v1/customers/12/archive',
      );
      expect(req.request.method).toBe(action === 'create' ? 'POST' : 'PATCH');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('X-CSRF-Protection')).toBe('1');
      expect(req.request.body).toEqual(action === 'archive' ? { is_archived: true } : data);
      req.flush(action === 'archive' ? { ...testCustomer, is_archived: true } : testCustomer);
    });
  }

  for (const status of [401, 403, 404, 409, 422, 500]) {
    it(`propagates ${status} while UI error mapping does not expose backend details`, () => {
      let message = '';
      service.create({ first_name: 'A', last_name: 'B', email: null, phone: null }).subscribe({
        error: (e) => {
          message = customerError(e);
        },
      });
      http
        .expectOne('/api/v1/customers')
        .flush({ detail: 'private stack trace' }, { status, statusText: 'Failure' });
      expect(message).not.toContain('private');
      expect(message.length).toBeGreaterThan(10);
    });
  }
});
