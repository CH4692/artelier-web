import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AccountControls } from './account-controls';
import { SessionState } from '../../core/auth/session-state';
import { testUser } from '../../../testing/auth';

describe('AccountControls', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountControls],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(SessionState).authenticate(testUser);
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('prevents duplicate logout and redirects only after confirmed revocation', async () => {
    const fixture = TestBed.createComponent(AccountControls);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.logout();
    fixture.componentInstance.logout();
    expect(TestBed.inject(SessionState).status()).toBe('authenticated');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/logout')
      .flush(null, { status: 204, statusText: 'No Content' });
    expect(TestBed.inject(SessionState).status()).toBe('unauthenticated');
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('explicitly reports failed logout and retains the authenticated state', async () => {
    const fixture = TestBed.createComponent(AccountControls);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    fixture.componentInstance.logout();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/logout')
      .flush({}, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(TestBed.inject(SessionState).status()).toBe('authenticated');
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'may still be active',
    );
  });
});
