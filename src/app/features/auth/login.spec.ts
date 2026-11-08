import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Login } from './login';
import { testUser } from '../../../testing/auth';
import { SessionState } from '../../core/auth/session-state';

describe('Login', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/repairs' }) } },
        },
      ],
    });
    TestBed.inject(SessionState).clear();
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('validates required fields, email syntax and lengths, with masked password and associated errors', async () => {
    const fixture = TestBed.createComponent(Login);
    fixture.componentInstance.submit();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('#password')?.getAttribute('type')).toBe('password');
    expect(element.querySelector('#email')?.getAttribute('aria-describedby')).toBe('email-error');
    expect(element.querySelector('#password-error')?.textContent).toContain('Enter your password');
    fixture.componentInstance.form.setValue({ email: 'invalid', password: 'a'.repeat(1025) });
    expect(fixture.componentInstance.form.invalid).toBe(true);
    fixture.componentInstance.submit();
    TestBed.inject(HttpTestingController).expectNone('/api/v1/auth/login');
  });

  it('prevents duplicate submissions and resumes the requested route after successful login', async () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.form.setValue({ email: testUser.email, password: 'test password' });
    component.submit();
    component.submit();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Signing in');
    TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/login').flush(testUser);
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/repairs', { replaceUrl: true });
    expect(component.form.controls.password.value).toBe('');
  });

  for (const status of [401, 403, 429, 500, 0]) {
    it(`handles ${status} safely, preserves email and clears password`, async () => {
      const fixture = TestBed.createComponent(Login);
      const component = fixture.componentInstance;
      component.form.setValue({ email: testUser.email, password: 'test password' });
      component.submit();
      const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/login');
      if (status === 0) request.error(new ProgressEvent('error'));
      else
        request.flush(
          { detail: 'sensitive backend information' },
          { status, statusText: 'Failure' },
        );
      await fixture.whenStable();
      expect(component.form.controls.email.value).toBe(testUser.email);
      expect(component.form.controls.password.value).toBe('');
      expect(component.pending()).toBe(false);
      const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alert.textContent).not.toContain('sensitive');
      expect(alert.textContent).toContain(
        status === 401 ? 'incorrect' : status === 429 ? 'wait' : 'try again',
      );
    });
  }

  it('sends customer accounts to access denied', () => {
    const fixture = TestBed.createComponent(Login);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.setValue({ email: testUser.email, password: 'password' });
    fixture.componentInstance.submit();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/v1/auth/login')
      .flush({ ...testUser, role: 'customer' });
    expect(navigate).toHaveBeenCalledWith('/access-denied', { replaceUrl: true });
  });
});
