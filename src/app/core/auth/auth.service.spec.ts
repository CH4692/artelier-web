import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SessionState } from './session-state';
import { testUser } from '../../../testing/auth';
import { SKIP_AUTH_REDIRECT } from './auth-context';

describe('Server-side authentication', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let session: SessionState;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    session = auth.session;
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('restores metadata from one shared server check after reload', () => {
    expect(session.status()).toBe('loading');
    expect(session.user()).toBeNull();
    auth.restore().subscribe();
    auth.restore().subscribe();
    const request = http.expectOne('/api/v1/auth/me');
    expect(request.request.context.get(SKIP_AUTH_REDIRECT)).toBe(true);
    request.flush(testUser);
    expect(session.status()).toBe('authenticated');
    expect(session.user()).toEqual(testUser);
    auth.restore().subscribe();
    http.expectNone('/api/v1/auth/me');
  });

  it('treats a missing or expired server session as unauthenticated', () => {
    auth.restore().subscribe();
    http.expectOne('/api/v1/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.status()).toBe('unauthenticated');
    expect(session.restorationFailed()).toBe(false);
  });

  it('fails closed on an outage without claiming the session expired', () => {
    auth.restore().subscribe();
    http.expectOne('/api/v1/auth/me').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(session.status()).toBe('unauthenticated');
    expect(session.restorationFailed()).toBe(true);
  });

  it('sends credentials only to the login endpoint and stores only returned metadata', () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    auth.login(testUser.email, 'test password').subscribe();
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.body).toEqual({ email: testUser.email, password: 'test password' });
    request.flush(testUser);
    expect(session.user()).toEqual(testUser);
    expect(local).not.toHaveBeenCalled();
    local.mockRestore();
  });

  it('does not restore an old response over a newer authenticated identity', () => {
    auth.restore().subscribe();
    session.authenticate({ ...testUser, id: 2 });
    http.expectOne('/api/v1/auth/me').flush(testUser);
    expect(session.user()?.id).toBe(2);
  });

  it('does not restore a pending response after logout', () => {
    auth.restore().subscribe();
    auth.logout().subscribe();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/v1/auth/me').flush(testUser);
    expect(session.status()).toBe('unauthenticated');
  });

  it('keeps local authentication on failed logout and clears it only after confirmation', () => {
    session.authenticate(testUser);
    auth.logout().subscribe({ error: () => undefined });
    http.expectOne('/api/v1/auth/logout').flush({}, { status: 500, statusText: 'Failure' });
    expect(session.status()).toBe('authenticated');
    auth.logout().subscribe();
    http.expectOne('/api/v1/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    expect(session.status()).toBe('unauthenticated');
    expect(session.user()).toBeNull();
  });
});
