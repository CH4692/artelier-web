import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.config';
import { ApiService } from './api.service';
import { apiBaseUrl, apiUrl, isTrustedApiUrl } from './api-url';

describe('API transport and configuration', () => {
  let api: ApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/v1/' },
      ],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('returns typed response bodies and preserves pagination metadata and encoded queries', () => {
    let total: string | null = null;
    api
      .getResponse<{ id: number }[]>('customers', { q: 'A & B', offset: 25 })
      .subscribe((response) => {
        total = response.headers.get('X-Total-Count');
        expect(response.body).toEqual([{ id: 1 }]);
      });
    const req = http.expectOne((request) => request.url === '/api/v1/customers');
    expect(req.request.params.get('q')).toBe('A & B');
    expect(req.request.params.get('offset')).toBe('25');
    req.flush([{ id: 1 }], { headers: { 'X-Total-Count': '26' } });
    expect(total).toBe('26');
  });
  it('does not cache reads and cancels the underlying request on unsubscribe', () => {
    const sub = api.get('customers/1').subscribe();
    const old = http.expectOne('/api/v1/customers/1');
    sub.unsubscribe();
    expect(old.cancelled).toBe(true);
    api.get('customers/1').subscribe();
    http.expectOne('/api/v1/customers/1').flush({ id: 1 });
  });
  it('uses the same boundary for writes and binary downloads', () => {
    api.post('customers', { first_name: 'A' }).subscribe();
    const post = http.expectOne('/api/v1/customers');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ first_name: 'A' });
    post.flush({ id: 1 });
    api.patch('customers/1', { email: null }).subscribe();
    const patch = http.expectOne('/api/v1/customers/1');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ email: null });
    patch.flush({});
    api.getBlob('instruments/1/qr-code.svg').subscribe();
    const blob = http.expectOne('/api/v1/instruments/1/qr-code.svg');
    expect(blob.request.responseType).toBe('blob');
    blob.flush(new Blob(['<svg/>'], { type: 'image/svg+xml' }));
  });
  it('supports configured absolute and relative versioned API URLs', () => {
    expect(apiUrl('https://api.example.com/api/v1/', '/customers')).toBe(
      'https://api.example.com/api/v1/customers',
    );
    expect(apiUrl('/api/v1', 'customers/1?include_archived=true')).toBe(
      '/api/v1/customers/1?include_archived=true',
    );
    expect(apiUrl('/proxy/api/v1', 'customers')).toBe('/proxy/api/v1/customers');
  });
  for (const base of [
    'https://user:secret@example.com/api/v1',
    'ftp://example.com/api/v1',
    '/api/v2',
    '/api/v1?token=x',
    '/api/v1#fragment',
    '//api.example.com/api/v1',
    'api/v1',
  ]) {
    it(`rejects unsupported API configuration ${base}`, () =>
      expect(() => apiBaseUrl(base)).toThrow());
  }
  for (const path of [
    '../auth',
    '../../api/v1/customers',
    'https://evil.example/x',
    '//evil.example/x',
    'customers#fragment',
    'customers\\..\\auth',
    '%2e%2e/auth',
    'customers/%2f../auth',
  ]) {
    it(`rejects escaped endpoint path ${path}`, () => expect(() => api.get(path)).toThrow());
  }
  for (const target of [
    'https://api.example.com.evil.example/api/v1/customers',
    'http://api.example.com/api/v1/customers',
    'https://api.example.com:444/api/v1/customers',
    'https://api.example.com/api/v10',
    'https://api.example.com/api/v1/%2f../other',
  ]) {
    it(`rejects a lookalike trust boundary ${target}`, () =>
      expect(isTrustedApiUrl(target, apiBaseUrl('https://api.example.com/api/v1'))).toBe(false));
  }
});
