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
