import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CustomerEditor } from './customer-editor';
import { testCustomer } from '../../../testing/customers';

describe('Customer editor', () => {
  let http: HttpTestingController;
  function setup(edit = false) {
    const params = new BehaviorSubject(convertToParamMap(edit ? { id: '12' } : {}));
    TestBed.configureTestingModule({
      imports: [CustomerEditor],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params, snapshot: { data: { edit }, paramMap: params.value } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CustomerEditor);
    return { fixture, component: fixture.componentInstance, params };
  }
  afterEach(() => http?.verify());

  it('validates trimmed required names, bounded fields, optional email and normalized phone formats', () => {
    const { component } = setup();
    component.form.setValue({ first_name: '   ', last_name: 'B', email: 'bad', phone: '12' });
    component.submit();
    expect(component.form.invalid).toBe(true);
    expect(component.fieldError('first_name')).toContain('Namen');
    component.form.setValue({
      first_name: ' ' + 'A'.repeat(100) + ' ',
      last_name: ' B ',
      email: ' maria@example.com ',
      phone: '0049 (5121) 123-45',
    });
    expect(component.form.valid).toBe(true);
    component.form.controls.first_name.setValue('𝒜'.repeat(100));
    expect(component.form.controls.first_name.valid).toBe(true);
    component.form.controls.first_name.setValue('A'.repeat(101));
    expect(component.form.controls.first_name.invalid).toBe(true);
    component.form.controls.phone.setValue('1'.repeat(65));
    expect(component.form.controls.phone.invalid).toBe(true);
    component.form.controls.email.setValue('');
    expect(component.form.controls.email.valid).toBe(true);
    component.form.controls.phone.setValue('');
    expect(component.form.controls.phone.valid).toBe(true);
    component.form.controls.phone.setValue('+0123');
    expect(component.form.controls.phone.invalid).toBe(true);
  });

  it('creates once, trims names, sends absent contacts as null and shows confirmation on the detail route', async () => {
    const { fixture, component } = setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.setValue({
      first_name: ' Maria ',
      last_name: ' Beispiel ',
      email: ' ',
      phone: '',
    });
    component.submit();
    component.submit();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    const req = http.expectOne('/api/v1/customers');
    expect(req.request.body).toEqual({
      first_name: 'Maria',
      last_name: 'Beispiel',
      email: null,
      phone: null,
    });
    req.flush(testCustomer);
    expect(navigate).toHaveBeenCalledWith(['/customers', 12], {
      state: { customerConfirmation: 'created' },
    });
  });

  it('loads existing and archived records for editing and preserves data on failure', async () => {
    const { fixture, component } = setup(true);
    http.expectOne('/api/v1/customers/12').flush({ ...testCustomer, is_archived: true });
    await fixture.whenStable();
    expect(component.form.controls.first_name.value).toBe('Maria');
    expect(fixture.nativeElement.textContent).toContain('archiviert');
    component.form.controls.first_name.setValue('Geändert');
    component.form.controls.phone.setValue('');
    component.submit();
    const req = http.expectOne('/api/v1/customers/12');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.phone).toBeNull();
    req.flush({}, { status: 500, statusText: 'Failure' });
    expect(component.form.controls.first_name.value).toBe('Geändert');
    expect(component.pending()).toBe(false);
    expect(component.error()).toContain('erneut');
  });

  it('maps backend 422 fields safely and retains input until corrected', async () => {
    const { fixture, component } = setup();
    await fixture.whenStable();
    component.form.setValue({ first_name: 'A', last_name: 'B', email: 'a@example.com', phone: '' });
    component.submit();
    http.expectOne('/api/v1/customers').flush(
      {
        detail: [
          { loc: ['body', 'email'], msg: 'sensitive detail' },
          { loc: ['body', 'unknown'], msg: 'private' },
        ],
      },
      { status: 422, statusText: 'Invalid' },
    );
    await fixture.whenStable();
    expect(component.form.controls.email.value).toBe('a@example.com');
    expect(component.fieldError('email')).toContain('prüfen');
    expect(fixture.nativeElement.textContent).not.toContain('sensitive');
    expect(fixture.nativeElement.querySelector('#email').getAttribute('aria-describedby')).toBe(
      'email-error',
    );
    component.form.controls.email.setValue('b@example.com');
    expect(component.form.controls.email.valid).toBe(true);
  });

  it('updates successfully and navigates to freshly loaded detail data', () => {
    const { component } = setup(true);
    http.expectOne('/api/v1/customers/12').flush(testCustomer);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.controls.last_name.setValue('Neu');
    component.submit();
    http.expectOne('/api/v1/customers/12').flush({ ...testCustomer, last_name: 'Neu' });
    expect(navigate).toHaveBeenCalledWith(['/customers', 12], {
      state: { customerConfirmation: 'updated' },
    });
  });

  for (const status of [401, 403, 404, 409]) {
    it(`preserves unsaved input on ${status}`, () => {
      const { component } = setup();
      component.form.setValue({ first_name: 'A', last_name: 'B', email: '', phone: '' });
      component.submit();
      http.expectOne('/api/v1/customers').flush({}, { status, statusText: 'Failure' });
      expect(component.form.controls.first_name.value).toBe('A');
      expect(component.pending()).toBe(false);
      expect(component.error()).not.toBe('');
    });
  }

  it('cancels old edit loads and pending changes when the route ID changes', () => {
    const { component, params } = setup(true);
    const old = http.expectOne('/api/v1/customers/12');
    params.next(convertToParamMap({ id: '13' }));
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/v1/customers/13').flush({ ...testCustomer, id: 13 });
    component.submit();
    const update = http.expectOne('/api/v1/customers/13');
    params.next(convertToParamMap({ id: '14' }));
    expect(update.cancelled).toBe(true);
    http.expectOne('/api/v1/customers/14').flush({ ...testCustomer, id: 14 });
  });
});
