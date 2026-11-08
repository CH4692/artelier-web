import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { authGuard, loginGuard } from './auth.guard';
import { SessionState } from './session-state';
import { testUser } from '../../../testing/auth';
import { safeReturnUrl } from './return-url';

const route = { data: { roles: ['admin', 'employee'] } } as unknown as ActivatedRouteSnapshot;
const state = { url: '/repairs?filter=open' } as RouterStateSnapshot;

describe('Authentication guards', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function runGuard(snapshot = route) {
    return firstValueFrom(
      TestBed.runInInjectionContext(() => authGuard(snapshot, state)) as Observable<
        boolean | UrlTree
      >,
    );
  }

  it('waits for session validation and preserves the original internal destination', async () => {
    const result = runGuard();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/me')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    const url = TestBed.inject(Router).serializeUrl((await result) as UrlTree);
    expect(url).toBe('/login?returnUrl=%2Frepairs%3Ffilter%3Dopen');
  });

  for (const role of ['employee', 'admin'] as const) {
    it(`allows workshop access for ${role}`, async () => {
      TestBed.inject(SessionState).authenticate({ ...testUser, role });
      expect(await runGuard()).toBe(true);
    });
  }

  it('routes customers to access denied without clearing their valid session', async () => {
    const session = TestBed.inject(SessionState);
    session.authenticate({ ...testUser, role: 'customer' });
    expect(TestBed.inject(Router).serializeUrl((await runGuard()) as UrlTree)).toBe(
      '/access-denied',
    );
    expect(session.status()).toBe('authenticated');
    expect(await runGuard({ data: {} } as ActivatedRouteSnapshot)).toBe(true);
  });

  it('supports role-specific routes', async () => {
    TestBed.inject(SessionState).authenticate(testUser);
    expect(
      await runGuard({ data: { roles: ['admin'] } } as unknown as ActivatedRouteSnapshot),
    ).toBeInstanceOf(UrlTree);
  });

  it('redirects an authenticated login visit to the requested workshop page', async () => {
    TestBed.inject(SessionState).authenticate(testUser);
    const result = await firstValueFrom(
      TestBed.runInInjectionContext(() =>
        loginGuard(route, { url: '/login?returnUrl=%2Fcustomers' } as RouterStateSnapshot),
      ) as Observable<UrlTree>,
    );
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/customers');
  });

  for (const target of [
    'https://evil.example',
    '//evil.example',
    '/login',
    '/access-denied',
    '/\\evil.example',
    '/%2f%2fevil.example',
    '/repairs\n',
  ]) {
    it(`rejects unsafe return destinations: ${JSON.stringify(target)}`, () => {
      expect(safeReturnUrl(target)).toBe('/dashboard');
    });
  }
});
