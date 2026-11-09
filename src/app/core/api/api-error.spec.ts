import {
  HttpErrorResponse,
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiError, normalizeApiError } from './api-error';
import { applyApiValidation } from './form-validation';
import { apiErrorInterceptor } from '../interceptors/api-error.interceptor';

describe('Normalized API errors', () => {
  let http: HttpTestingController;
  let client: HttpClient;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });
  afterEach(() => http.verify());
  for (const [status, kind] of [
    [400, 'bad-request'],
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [422, 'validation'],
    [429, 'rate-limit'],
    [500, 'server'],
    [503, 'server'],
  ] as const) {
    it(`normalizes HTTP ${status} without retrying or exposing backend details`, () => {
      let result: ApiError | undefined;
      client
        .post('/api/v1/customers', {})
        .subscribe({ error: (error: ApiError) => (result = error) });
      http
        .expectOne('/api/v1/customers')
        .flush({ detail: 'secret traceback', input: 'private' }, { status, statusText: 'Failure' });
      expect(result).toBeInstanceOf(ApiError);
      expect(result?.status).toBe(status);
      expect(result?.kind).toBe(kind);
      expect(result?.userMessage).not.toContain('secret');
      expect(JSON.stringify(result)).not.toContain('private');
      expect(result?.error).toBeNull();
      http.expectNone('/api/v1/customers');
    });
  }
  it('handles network failures and does not normalize third-party failures', () => {
    const results: unknown[] = [];
    client.get('/api/v1/customers').subscribe({ error: (error) => results.push(error) });
    http.expectOne('/api/v1/customers').error(new ProgressEvent('error'));
    expect(results[0]).toBeInstanceOf(ApiError);
    expect((results[0] as ApiError).kind).toBe('network');
    client
      .get('https://untrusted.example/test')
      .subscribe({ error: (error) => results.push(error) });
    http
      .expectOne('https://untrusted.example/test')
      .flush({}, { status: 500, statusText: 'Failure' });
    expect(results[1]).toBeInstanceOf(HttpErrorResponse);
    expect(results[1]).not.toBeInstanceOf(ApiError);
  });
  it('distinguishes existing CSRF/transport rejection details from role denial', () => {
    for (const detail of ['Request forbidden', 'HTTPS required']) {
      const error = normalizeApiError(new HttpErrorResponse({ status: 403, error: { detail } }));
      expect(error.kind).toBe('csrf');
      expect(error.userMessage).toContain('Sicherheitsprüfung');
      expect(normalizeApiError(error)).toBe(error);
    }
    expect(normalizeApiError(new Error('secret')).kind).toBe('unknown');
  });
  it('maps only supported direct body fields, preserves other validators and discards raw input/context', () => {
    const form = new FormGroup({
      email: new FormControl('', Validators.required),
      name: new FormControl('unchanged'),
      disabled: new FormControl({ value: 'keep', disabled: true }),
    });
    const error = normalizeApiError(
      new HttpErrorResponse({
        status: 422,
        error: {
          detail: [
            { loc: ['body', 'email'], msg: 'private', input: 'secret', ctx: { error: 'trace' } },
            { loc: ['body', 'unknown'] },
            { loc: ['query', 'name'] },
            { loc: ['body', 'nested', 'name'] },
            { loc: ['body'] },
            { loc: ['body', '__proto__'] },
            { loc: ['body', 'disabled'] },
            { loc: 'email' },
            { loc: ['body', {}] },
            null,
          ],
        },
      }),
    );
    expect(applyApiValidation(form, error)).toBe(1);
    expect(form.controls.email.hasError('required')).toBe(true);
    expect(form.controls.email.hasError('server')).toBe(true);
    expect(form.controls.email.touched).toBe(true);
    expect(form.controls.name.value).toBe('unchanged');
    expect(form.controls.name.errors).toBeNull();
    expect(JSON.stringify(error)).not.toMatch(/private|secret|trace/);
    form.controls.email.setValue('corrected@example.com');
    expect(form.controls.email.valid).toBe(true);
  });
});
