import { HttpContext, HttpErrorResponse } from '@angular/common/http';
import { SessionState } from '../auth/session-state';
import { SessionNavigation } from '../auth/session-navigation';
import { SKIP_AUTH_REDIRECT } from '../auth/auth-context';
import { testUser } from '../../../testing/auth';
import { provideRouter } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.config';
import { ApiService } from '../api/api.service';
import { apiSessionInterceptor } from './api-session.interceptor';

describe('API session boundary', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/v1' },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    it(`sends session credentials and CSRF protection for ${method}`, () => {
      client.request(method, '/api/v1/customers').subscribe();
      const request = http.expectOne('/api/v1/customers');
      expect(request.request.withCredentials).toBe(true);
      expect(request.request.headers.get('X-CSRF-Protection')).toBe('1');
      request.flush({});
    });
  }

  it('uses the configured API base for reads without a write header', () => {
    TestBed.inject(ApiService).get<unknown>('customers').subscribe();
    const request = http.expectOne('/api/v1/customers');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.has('X-CSRF-Protection')).toBe(false);
    request.flush([]);
  });

  for (const url of [
    'https://unrelated.example/api/v1/customers',
    '/api/v10/customers',
    '/assets/example.json',
  ]) {
    it(`leaves requests outside the API boundary untouched: ${url}`, () => {
      client.post(url, {}).subscribe();
      const request = http.expectOne(url);
      expect(request.request.withCredentials).toBe(false);
      expect(request.request.headers.has('X-CSRF-Protection')).toBe(false);
      request.flush({});
    });
  }

  it('supports an explicitly configured cross-origin API', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.com/api/v1' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(HttpClient).post('https://api.example.com/api/v1/auth/logout', {}).subscribe();
    const request = http.expectOne('https://api.example.com/api/v1/auth/logout');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Protection')).toBe('1');
    request.flush({});
  });
});

describe('Session response handling', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  let session: SessionState;
  let redirect: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    session = TestBed.inject(SessionState);
    session.authenticate(testUser);
    redirect = vi
      .spyOn(TestBed.inject(SessionNavigation), 'redirect')
      .mockImplementation(() => undefined);
  });
  afterEach(() => http.verify());

  it('expires the local session and redirects once for concurrent 401 responses', () => {
    client.get('/api/v1/repairs').subscribe({ error: () => undefined });
    client.get('/api/v1/customers').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/repairs').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/v1/customers').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.status()).toBe('unauthenticated');
    expect(redirect).toHaveBeenCalledExactlyOnceWith(401);
  });

  it('distinguishes forbidden access from missing authentication', () => {
    client.get('/api/v1/repairs').subscribe({ error: () => undefined });
    http.expectOne('/api/v1/repairs').flush({}, { status: 403, statusText: 'Forbidden' });
    expect(session.user()).toEqual(testUser);
    expect(redirect).toHaveBeenCalledExactlyOnceWith(403);
  });

  for (const url of [
    '/api/v1/auth/login',
    '/api/v1/auth/logout',
    '/api/v1/auth/me',
    'https://untrusted.example/api/v1/repairs',
  ]) {
    for (const status of [401, 403]) {
      it(`does not redirect for ${status} from ${url}`, () => {
        client.post(url, {}).subscribe({ error: () => undefined });
        http.expectOne(url).flush({}, { status, statusText: 'Failure' });
        expect(redirect).not.toHaveBeenCalled();
        expect(session.status()).toBe('authenticated');
      });
    }
  }

  it('supports explicitly public API requests without expiring the workshop session', () => {
    client
      .get('/api/v1/public', { context: new HttpContext().set(SKIP_AUTH_REDIRECT, true) })
      .subscribe({ error: () => undefined });
    http.expectOne('/api/v1/public').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.status()).toBe('authenticated');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('does not invalidate a new session because an older request failed', () => {
    client.get('/api/v1/repairs').subscribe({ error: () => undefined });
    session.authenticate({ ...testUser, id: 2 });
    http.expectOne('/api/v1/repairs').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.user()?.id).toBe(2);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('propagates unexpected errors without changing session state or navigating', () => {
    let result: unknown;
    client.get('/api/v1/repairs').subscribe({
      error: (error) => {
        result = error;
      },
    });
    http.expectOne('/api/v1/repairs').flush({}, { status: 500, statusText: 'Failure' });
    expect(result).toBeInstanceOf(HttpErrorResponse);
    expect(session.status()).toBe('authenticated');
    expect(redirect).not.toHaveBeenCalled();
  });
});
