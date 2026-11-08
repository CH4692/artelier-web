import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { apiSessionInterceptor } from '../interceptors/api-session.interceptor';
import { SessionState } from './session-state';
import { AuthService } from './auth.service';
import { testUser } from '../../../testing/auth';

describe('Session lifecycle integration', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([apiSessionInterceptor])),
        provideHttpClientTesting(),
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('restores a deep link and handles expiration by showing the login message', async () => {
    const harness = await RouterTestingHarness.create();
    const navigation = harness.navigateByUrl('/repairs?filter=open');
    await vi.waitFor(() => {
      const requests = TestBed.inject(HttpTestingController).match('/api/v1/auth/me');
      expect(requests).toHaveLength(1);
      expect(requests[0].request.withCredentials).toBe(true);
      requests[0].flush(testUser);
    });
    await navigation;
    expect(TestBed.inject(Router).url).toBe('/repairs?filter=open');
    TestBed.inject(HttpClient)
      .get('/api/v1/repairs')
      .subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/repairs')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toContain('/login?'));
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Your session has expired');
    expect(TestBed.inject(SessionState).status()).toBe('unauthenticated');
  });

  it('uses the CSRF contract for login/logout and blocks protected navigation after logout', async () => {
    const auth = TestBed.inject(AuthService);
    auth.session.clear();
    auth.login(testUser.email, 'test password').subscribe();
    const login = TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/login');
    expect(login.request.withCredentials).toBe(true);
    expect(login.request.headers.get('X-CSRF-Protection')).toBe('1');
    login.flush(testUser);
    const harness = await RouterTestingHarness.create('/customers');
    auth.logout().subscribe();
    const logout = TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/logout');
    expect(logout.request.withCredentials).toBe(true);
    expect(logout.request.headers.get('X-CSRF-Protection')).toBe('1');
    logout.flush(null, { status: 204, statusText: 'No Content' });
    await harness.navigateByUrl('/repairs');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Frepairs');
    expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull();
  });
});
