import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { InstrumentEditor } from './instrument-editor';
import { testInstrument } from '../../../testing/instruments';

describe('Instrument editor and ownership', () => {
  let http: HttpTestingController;
  function setup(edit = false) {
    const params = new BehaviorSubject(convertToParamMap(edit ? { id: '8' } : {}));
    TestBed.configureTestingModule({
      imports: [InstrumentEditor],
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
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(InstrumentEditor);
    return { fixture, component: fixture.componentInstance, params };
  }
  afterEach(() => http?.verify());
  it('requires a valid type and enforces finite positive measurements and integer year bounds', () => {
    const { component } = setup();
    expect(component.form.invalid).toBe(true);
    component.form.controls.type.setValue('violin');
    expect(component.form.valid).toBe(true);
    for (const value of [0, -1, Infinity, NaN]) {
      component.form.controls.body_length_mm.setValue(value);
      expect(component.form.controls.body_length_mm.invalid).toBe(true);
    }
    component.form.controls.body_length_mm.setValue(356.5);
    expect(component.form.controls.body_length_mm.valid).toBe(true);
    for (const value of [0, 10000, 2000.5]) {
      component.form.controls.year_of_manufacture.setValue(value);
      expect(component.form.controls.year_of_manufacture.invalid).toBe(true);
    }
    component.form.controls.year_of_manufacture.setValue(9999);
    expect(component.form.valid).toBe(true);
  });
  it('creates once with nullable optional fields and navigates to a fresh detail page', async () => {
    const { fixture, component } = setup();
    await fixture.whenStable();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.controls.type.setValue('violin');
    component.submit();
    component.submit();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const req = http.expectOne('/api/v1/instruments');
    expect(req.request.body).toEqual({
      type: 'violin',
      ownership: 'unassigned',
      customer_id: null,
      maker: null,
      identification_number: null,
      notes: null,
      year_of_manufacture: null,
      body_length_mm: null,
      bow_weight_g: null,
    });
    req.flush(testInstrument);
    expect(navigate).toHaveBeenCalledWith(['/instruments', 8], {
      state: { instrumentConfirmation: 'created' },
    });
  });
  it('clears incompatible measurements and owner IDs explicitly in the update payload', () => {
    const { component } = setup(true);
    http.expectOne('/api/v1/instruments/8').flush(testInstrument);
    component.form.controls.type.setValue('bow');
    expect(component.form.controls.body_length_mm.value).toBeNull();
    component.form.controls.bow_weight_g.setValue(60);
    component.form.controls.ownership.setValue('workshop');
    expect(component.form.controls.customer_id.value).toBeNull();
    component.submit();
    const req = http.expectOne('/api/v1/instruments/8');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toMatchObject({
      type: 'bow',
      body_length_mm: null,
      bow_weight_g: 60,
      ownership: 'workshop',
      customer_id: null,
    });
    req.flush({
      ...testInstrument,
      type: 'bow',
      ownership: 'workshop',
      customer_id: null,
      body_length_mm: null,
      bow_weight_g: 60,
    });
  });
  it('supports assigning an existing customer and unknown customer ownership without inventing a required owner', () => {
    const { component } = setup();
    component.form.controls.type.setValue('cello');
    component.form.controls.ownership.setValue('customer');
    expect(component.form.valid).toBe(true);
    component.form.controls.customer_id.setValue(12);
    component.submit();
    const req = http.expectOne('/api/v1/instruments');
    expect(req.request.body.customer_id).toBe(12);
    req.flush(testInstrument);
  });
  it('maps safe 422 field errors and preserves unsaved input', async () => {
    const { fixture, component } = setup();
    await fixture.whenStable();
    component.form.controls.type.setValue('violin');
    component.form.controls.maker.setValue('Ungespeichert');
    component.form.controls.body_length_mm.setValue(356);
    await fixture.whenStable();
    component.submit();
    http
      .expectOne('/api/v1/instruments')
      .flush(
        { detail: [{ loc: ['body', 'body_length_mm'], msg: 'private detail' }] },
        { status: 422, statusText: 'Invalid' },
      );
    await fixture.whenStable();
    expect(component.form.controls.maker.value).toBe('Ungespeichert');
    expect(component.fieldError('body_length_mm')).toContain('prüfen');
    expect(fixture.nativeElement.textContent).not.toContain('private');
    component.form.controls.body_length_mm.setValue(355);
    expect(component.form.controls.body_length_mm.valid).toBe(true);
  });
  for (const status of [401, 403, 404, 409, 503]) {
    it(`retains data after ${status}`, () => {
      const { component } = setup();
      component.form.controls.type.setValue('viola');
      component.form.controls.maker.setValue('Behalten');
      component.submit();
      http.expectOne('/api/v1/instruments').flush({}, { status, statusText: 'Failure' });
      expect(component.form.controls.maker.value).toBe('Behalten');
      expect(component.pending()).toBe(false);
      expect(component.error()).not.toBe('');
    });
  }
  it('cancels stale edit loads on reused route IDs', () => {
    const { params } = setup(true);
    const old = http.expectOne('/api/v1/instruments/8');
    params.next(convertToParamMap({ id: '9' }));
    expect(old.cancelled).toBe(true);
    http.expectOne('/api/v1/instruments/9').flush({ ...testInstrument, id: 9 });
  });
});
